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

const retryConversationController = factory.createHandlers(
	describeRoute({
		description:
			"Answers the chat again after its latest run failed, without a new message, and streams the reply.",
		tags: ["agent"],
		summary: "Retry Agent Conversation",
		requestBody: openAPI.requestBody(controllerSchemas.retryConversation.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.retryConversation.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(true),
	validate("param", controllerSchemas.retryConversation.params),
	validate("json", controllerSchemas.retryConversation.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");

		const run = await serviceWrapper(agentServices.retryConversation, {
			transaction: false,
		})(context, {
			conversationId: c.req.valid("param").id,
			userId: c.get("auth").id,
			requestId: body.requestId,
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

export default retryConversationController;
