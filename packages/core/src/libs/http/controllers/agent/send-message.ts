import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/agent.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";
import streamEvents from "./helpers/stream-events.js";

const factory = createFactory();

const sendMessageController = factory.createHandlers(
	describeRoute({
		description:
			"Sends or queues user input. Idle requests accepting SSE stream the new run; pending input returns 202.",
		tags: ["agent"],
		summary: "Send Agent Message",
		requestBody: openAPI.requestBody(controllerSchemas.sendMessage.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.sendMessage.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(true),
	validate("param", controllerSchemas.sendMessage.params),
	validate("json", controllerSchemas.sendMessage.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");
		const param = c.req.valid("param");

		const streaming =
			c.req.header("accept")?.includes("text/event-stream") === true;

		const run = await serviceWrapper(agentServices.submitInput, {
			transaction: false,
		})(context, {
			conversationId: param.id,
			userId: c.get("auth").id,
			dispatch: !streaming,
			text: body.text,
			delivery: body.delivery,
			requestId: body.requestId,
		});
		if (run.error) throw new LucidAPIError(run.error);

		const runId = run.data.runId;
		if (!streaming || !runId) {
			return c.json(formatAPIResponse(c, { data: run.data }), 202);
		}

		return streamEvents(c, (stream) =>
			serviceWrapper(agentServices.executeRun, {
				transaction: false,
				logError: true,
			})(context, { runId, ...stream }),
		);
	},
);

export default sendMessageController;
