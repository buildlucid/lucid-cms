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

const translateDocumentsController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Translate documents from their default locale with Lucid AI. Opens a request per target locale, or returns the values for the open editor. Several documents are translated in the background.",
		tags: ["documents"],
		summary: "Translate Documents",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.translateDocuments.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.translateDocuments.params,
			headers: { csrf: true },
		}),
		requestBody: openAPI.requestBody(controllerSchemas.translateDocuments.body),
	})),
	validateCSRF(),
	authenticate(),
	permissions([Permissions.AiTranslate]),
	validate("param", controllerSchemas.translateDocuments.params),
	validate("json", controllerSchemas.translateDocuments.body),
	async (c) => {
		const { collectionKey } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(
			translationServices.translateDocuments,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.translations.error.name"),
					message: copy("server:core.routes.translations.error.message"),
				},
			},
		)(context, {
			collectionKey,
			documentIds: body.documentIds,
			targetLocales: body.targetLocales,
			overwrite: body.overwrite,
			note: body.note,
			delivery: body.delivery,
			content: body.content,
			queue: true,
			user: c.get("auth"),
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default translateDocumentsController;
