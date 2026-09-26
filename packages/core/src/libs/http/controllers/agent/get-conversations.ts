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
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getConversationsController = factory.createHandlers(
	describeRoute({
		description:
			"Returns the user's own conversations, and conversations started by code routines on agents they manage.",
		tags: ["agent"],
		summary: "Get Agent Conversations",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.getMultipleConversations.response,
			),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.getMultipleConversations.query.string,
		}),
	}),
	authenticate(),
	agentAccess(),
	validate("query", controllerSchemas.getMultipleConversations.query.string),
	async (c) => {
		const context = createServiceContext(c);
		const query = await buildFormattedQuery(
			c,
			controllerSchemas.getMultipleConversations.query.formatted,
		);

		const conversations = await serviceWrapper(agentServices.getConversations, {
			transaction: false,
		})(context, { userId: c.get("auth").id, query });
		if (conversations.error) throw new LucidAPIError(conversations.error);

		c.status(200);

		return c.json(
			formatAPIResponse(c, {
				data: conversations.data.data,
				pagination: {
					count: conversations.data.count,
					page: query.page,
					perPage: query.perPage,
				},
			}),
		);
	},
);

export default getConversationsController;
