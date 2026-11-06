import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/translations.js";
import { translationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getStatusController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Compare documents' latest translations with their default locale: what's missing, out of date or written by people.",
		tags: ["documents"],
		summary: "Get Translation Status",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getStatus.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getStatus.params,
			headers: { csrf: true },
		}),
		requestBody: openAPI.requestBody(controllerSchemas.getStatus.body),
	})),
	validateCSRF(),
	authenticate(),
	permissions([Permissions.AiTranslate]),
	validate("param", controllerSchemas.getStatus.params),
	validate("json", controllerSchemas.getStatus.body),
	async (c) => {
		const { collectionKey } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(translationServices.getStatus, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.translations.error.name"),
				message: copy("server:core.routes.translations.error.message"),
			},
		})(context, {
			collectionKey,
			documentIds: body.documentIds,
			user: c.get("auth"),
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default getStatusController;
