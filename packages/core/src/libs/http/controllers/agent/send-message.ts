import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/agent.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import { streamRun } from "../../utils/agent-stream-events.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const sendMessageController = factory.createHandlers(
	describeRoute({
		description:
			"Sends or queues input. When the conversation is idle and the request accepts text/event-stream, the new run is streamed. Otherwise it returns 202 with the run answering it, or null while the input is queued.",
		tags: ["agent"],
		summary: "Send Agent Message",
		responses: openAPI.responses({
			stream: true,
			status: 202,
			dataSchema: z.toJSONSchema(controllerSchemas.sendMessage.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.sendMessage.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.sendMessage.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF(),
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
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.agent.error.name"),
				message: copy("server:core.routes.agent.error.message"),
			},
		})(context, {
			conversationId: param.id,
			userId: c.get("auth").id,
			dispatch: !streaming,
			text: body.text,
			references: body.references,
			screen: body.screen,
			timezone: body.timezone,
			delivery: body.delivery,
			inputId: body.inputId,
		});
		if (run.error) throw new LucidAPIError(run.error);

		const runId = run.data.runId;
		if (!streaming || !runId) {
			return c.json(formatAPIResponse(c, { data: run.data }), 202);
		}

		return streamRun(c, context, { runId });
	},
);

export default sendMessageController;
