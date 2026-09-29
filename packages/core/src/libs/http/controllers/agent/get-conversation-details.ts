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

const getConversationDetailsController = factory.createHandlers(
	describeRoute({
		description:
			"Returns the web sources a conversation's agent found or read.",
		tags: ["agent"],
		summary: "Get Agent Conversation Details",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.getConversationDetails.response,
			),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getConversationDetails.params,
		}),
	}),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.getConversationDetails.params),
	async (c) => {
		const context = createServiceContext(c);
		const param = c.req.valid("param");

		const details = await serviceWrapper(agentServices.getConversationDetails, {
			transaction: false,
		})(context, {
			id: param.id,
			userId: c.get("auth").id,
		});
		if (details.error) throw new LucidAPIError(details.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: details.data }));
	},
);

export default getConversationDetailsController;
