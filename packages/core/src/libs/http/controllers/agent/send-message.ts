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
import createServiceContext from "../../utils/create-service-context.js";
import streamEvents from "./helpers/stream-events.js";

const factory = createFactory();

const sendMessageController = factory.createHandlers(
	describeRoute({
		description:
			"Sends a message and streams the agent's response as server-sent events.",
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

		const run = await serviceWrapper(agentServices.startRun, {
			transaction: false,
		})(context, {
			conversationId: c.req.valid("param").id,
			userId: c.get("auth").id,
			...c.req.valid("json"),
		});
		if (run.error) throw new LucidAPIError(run.error);

		return streamEvents(c, (stream) =>
			serviceWrapper(agentServices.executeRun, {
				transaction: false,
				logError: true,
			})(context, { runId: run.data.runId, ...stream }),
		);
	},
);

export default sendMessageController;
