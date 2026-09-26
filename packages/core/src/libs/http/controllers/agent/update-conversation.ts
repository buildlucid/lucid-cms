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

const updateConversationController = factory.createHandlers(
	describeRoute({
		description: "Renames an agent conversation.",
		tags: ["agent"],
		summary: "Update Agent Conversation",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.updateConversation.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updateConversation.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.updateConversation.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.updateConversation.params),
	validate("json", controllerSchemas.updateConversation.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");
		const param = c.req.valid("param");

		const conversation = await serviceWrapper(
			agentServices.updateConversation,
			{ transaction: false },
		)(context, {
			id: param.id,
			userId: c.get("auth").id,
			title: body.title,
		});
		if (conversation.error) throw new LucidAPIError(conversation.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: conversation.data }));
	},
);

export default updateConversationController;
