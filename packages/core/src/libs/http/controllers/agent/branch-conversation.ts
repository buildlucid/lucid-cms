import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
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
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const branchConversationController = factory.createHandlers(
	describeRoute({
		description:
			"Copies a chat up to and including a finished reply into a new chat owned by the user.",
		tags: ["agent"],
		summary: "Branch Agent Conversation",
		responses: openAPI.responses({
			status: 201,
			dataSchema: z.toJSONSchema(controllerSchemas.branchConversation.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.branchConversation.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.branchConversation.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF(),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.branchConversation.params),
	validate("json", controllerSchemas.branchConversation.body),
	async (c) => {
		const context = createServiceContext(c);

		const conversation = await serviceWrapper(
			agentServices.branchConversation,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.agent.error.name"),
					message: copy("server:core.routes.agent.error.message"),
				},
			},
		)(context, {
			conversationId: c.req.valid("param").id,
			messageId: c.req.valid("json").messageId,
			userId: c.get("auth").id,
		});
		if (conversation.error) throw new LucidAPIError(conversation.error);

		c.status(201);

		return c.json(formatAPIResponse(c, { data: conversation.data }));
	},
);

export default branchConversationController;
