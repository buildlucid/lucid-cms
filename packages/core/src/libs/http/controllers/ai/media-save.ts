import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/ai.js";
import { aiServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { mediaGenerationPermissions } from "../../../config/ai-features.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const mediaSaveController = factory.createHandlers(
	describeRoute({
		description:
			"Copies your finished media generation into media storage. Create or update media with the returned key before it expires.",
		tags: ["ai"],
		summary: "Save Generated Media",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.mediaSave.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.mediaSave.body),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.mediaSave.params,
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions({ some: mediaGenerationPermissions }),
	permissions({ some: [Permissions.MediaCreate, Permissions.MediaUpdate] }),
	validate("param", controllerSchemas.mediaSave.params),
	validate("json", controllerSchemas.mediaSave.body),
	async (c) => {
		const params = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const saved = await serviceWrapper(aiServices.mediaSave, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.generate.error.name"),
				message: copy("server:core.routes.ai.generate.error.message"),
			},
		})(context, {
			requestId: params.requestId,
			public: body.public,
			temporary: body.temporary,
			userId: c.get("auth").id,
			signal: c.req.raw.signal,
		});
		if (saved.error) throw new LucidAPIError(saved.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: saved.data }));
	},
);

export default mediaSaveController;
