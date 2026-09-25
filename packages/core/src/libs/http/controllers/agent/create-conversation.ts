import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
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

const factory = createFactory();

const createConversationController = factory.createHandlers(
	describeRoute({
		description: "Creates an empty agent conversation.",
		tags: ["agent"],
		summary: "Create Agent Conversation",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.createConversation.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.createConversation.body),
		parameters: openAPI.parameters({ headers: { csrf: true } }),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(),
	validate("json", controllerSchemas.createConversation.body),
	async (c) => {
		const context = createServiceContext(c);

		const conversation = await serviceWrapper(
			agentServices.createConversation,
			{ transaction: false },
		)(context, {
			userId: c.get("auth").id,
			title: c.req.valid("json").title,
		});
		if (conversation.error) throw new LucidAPIError(conversation.error);

		c.status(201);

		return c.json(formatAPIResponse(c, { data: conversation.data }));
	},
);

export default createConversationController;
