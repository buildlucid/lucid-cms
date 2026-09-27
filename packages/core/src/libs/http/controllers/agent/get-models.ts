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

const getModelsController = factory.createHandlers(
	describeRoute({
		description:
			"Returns the models an agent offers, and the one a new chat or routine run uses by default.",
		tags: ["agent"],
		summary: "Get Agent Models",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getModels.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getModels.params,
			query: controllerSchemas.getModels.query.string,
		}),
	}),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.getModels.params),
	validate("query", controllerSchemas.getModels.query.string),
	async (c) => {
		const context = createServiceContext(c);
		const param = c.req.valid("param");

		const models = await serviceWrapper(agentServices.getModels, {
			transaction: false,
		})(context, {
			agentKey: param.agentKey,
			routineId: c.req.valid("query").routineId,
			userId: c.get("auth").id,
		});
		if (models.error) throw new LucidAPIError(models.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: models.data }));
	},
);

export default getModelsController;
