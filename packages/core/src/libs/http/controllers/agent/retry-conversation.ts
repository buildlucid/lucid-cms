import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/agent.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import { streamRun } from "../../utils/agent-stream-events.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const retryConversationController = factory.createHandlers(
	describeRoute({
		description:
			"Answers the chat again after its latest run failed, without a new message, and streams the reply.",
		tags: ["agent"],
		summary: "Retry Agent Conversation",
		responses: openAPI.responses({ stream: true }),
		requestBody: openAPI.requestBody(controllerSchemas.retryConversation.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.retryConversation.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF(),
	authenticate(),
	agentAccess(true),
	validate("param", controllerSchemas.retryConversation.params),
	validate("json", controllerSchemas.retryConversation.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");

		const run = await serviceWrapper(agentServices.retryConversation, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.agent.error.name"),
				message: copy("server:core.routes.agent.error.message"),
			},
		})(context, {
			conversationId: c.req.valid("param").id,
			userId: c.get("auth").id,
			runId: body.runId,
		});
		if (run.error) throw new LucidAPIError(run.error);

		return streamRun(c, context, { runId: run.data.runId });
	},
);

export default retryConversationController;
