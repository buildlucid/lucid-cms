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

const getMessagesController = factory.createHandlers(
	describeRoute({
		description:
			"Returns a conversation's latest messages in order. Pass before to load earlier messages.",
		tags: ["agent"],
		summary: "Get Agent Messages",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getMessages.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getMessages.params,
			query: controllerSchemas.getMessages.query.string,
		}),
	}),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.getMessages.params),
	validate("query", controllerSchemas.getMessages.query.string),
	async (c) => {
		const context = createServiceContext(c);

		const messages = await serviceWrapper(agentServices.getMessages, {
			transaction: false,
		})(context, {
			conversationId: c.req.valid("param").id,
			userId: c.get("auth").id,
			...c.req.valid("query"),
		});
		if (messages.error) throw new LucidAPIError(messages.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: messages.data }));
	},
);

export default getMessagesController;
