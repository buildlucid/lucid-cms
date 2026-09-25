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
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getConversationController = factory.createHandlers(
	describeRoute({
		description: "Returns a single agent conversation.",
		tags: ["agent"],
		summary: "Get Agent Conversation",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getConversation.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getConversation.params,
		}),
	}),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.getConversation.params),
	async (c) => {
		const context = createServiceContext(c);

		const conversation = await serviceWrapper(agentServices.getConversation, {
			transaction: false,
		})(context, {
			id: c.req.valid("param").id,
			userId: c.get("auth").id,
		});
		if (conversation.error) throw new LucidAPIError(conversation.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: conversation.data }));
	},
);

export default getConversationController;
