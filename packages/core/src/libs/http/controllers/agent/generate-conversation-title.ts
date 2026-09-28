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

const generateConversationTitleController = factory.createHandlers(
	describeRoute({
		description: "Suggests a title from the conversation's saved messages.",
		tags: ["agent"],
		summary: "Generate Agent Conversation Title",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.generateConversationTitle.response,
			),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.generateConversationTitle.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.generateConversationTitle.params),
	async (c) => {
		const context = createServiceContext(c);
		const param = c.req.valid("param");

		const result = await serviceWrapper(
			agentServices.generateConversationTitle,
			{ transaction: false },
		)(context, { id: param.id, userId: c.get("auth").id });
		if (result.error) throw new LucidAPIError(result.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default generateConversationTitleController;
