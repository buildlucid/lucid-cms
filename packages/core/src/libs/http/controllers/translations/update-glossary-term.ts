import { createFactory } from "hono/factory";
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
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateGlossaryTermController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description: "Replace a glossary term's term, locale and translation.",
		tags: ["translations"],
		summary: "Update Glossary Term",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({
			params: controllerSchemas.updateGlossaryTerm.params,
			headers: { csrf: true },
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updateGlossaryTerm.body),
	})),
	validateCSRF(),
	authenticate(),
	permissions([Permissions.SettingsUpdate]),
	validate("param", controllerSchemas.updateGlossaryTerm.params),
	validate("json", controllerSchemas.updateGlossaryTerm.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(
			translationServices.updateGlossaryTerm,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.translations.error.name"),
					message: copy("server:core.routes.translations.error.message"),
				},
			},
		)(context, {
			id: Number.parseInt(id, 10),
			term: body.term,
			locale: body.locale,
			translation: body.translation,
			userId: c.get("auth").id,
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateGlossaryTermController;
