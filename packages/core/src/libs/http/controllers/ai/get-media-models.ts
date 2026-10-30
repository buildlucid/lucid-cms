import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/ai.js";
import { aiServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { mediaGenerationPermissions } from "../../../config/ai-features.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getMediaModelsController = factory.createHandlers(
	describeRoute({
		description:
			"Returns the models people can pick to generate a media type, and the one used by default.",
		tags: ["ai"],
		summary: "Get Media Generation Models",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getMediaModels.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getMediaModels.params,
		}),
	}),
	authenticate(),
	permissions({ some: mediaGenerationPermissions }),
	validate("param", controllerSchemas.getMediaModels.params),
	async (c) => {
		const { type } = c.req.valid("param");
		const context = createServiceContext(c);

		const models = await serviceWrapper(aiServices.getMediaModelOptions, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.generate.error.name"),
				message: copy("server:core.ai.models.unavailable"),
			},
		})(context, { type });
		if (models.error) throw new LucidAPIError(models.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: models.data }));
	},
);

export default getMediaModelsController;
