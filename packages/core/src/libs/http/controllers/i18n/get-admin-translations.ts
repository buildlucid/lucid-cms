import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/i18n.js";
import { i18nServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { text } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getAdminTranslationsController = factory.createHandlers(
	describeRoute({
		description: "Returns merged admin interface translations for a locale.",
		tags: ["i18n"],
		summary: "Get Admin Translations",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getAdminTranslations.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getAdminTranslations.params,
		}),
	}),
	authenticate,
	validate("param", controllerSchemas.getAdminTranslations.params),
	async (c) => {
		const { locale } = c.req.valid("param");
		const context = createServiceContext(c);

		const translations = await serviceWrapper(
			i18nServices.getAdminTranslations,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: text.server("core.errors.default.name"),
					message: text.server("core.errors.default.message"),
				},
			},
		)(context, { locale });
		if (translations.error) throw new LucidAPIError(translations.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: translations.data,
			}),
		);
	},
);

export default getAdminTranslationsController;
