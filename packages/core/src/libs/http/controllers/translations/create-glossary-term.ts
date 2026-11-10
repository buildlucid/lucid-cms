import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/translations.js";
import { translationServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
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

const createGlossaryTermController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Add a glossary term that translations keep as written or always translate the same way.",
		tags: ["translations"],
		summary: "Create Glossary Term",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({ headers: { csrf: true } }),
		requestBody: openAPI.requestBody(controllerSchemas.createGlossaryTerm.body),
	})),
	validateCSRF(),
	authenticate(),
	permissions([Permissions.SettingsUpdate]),
	validate("json", controllerSchemas.createGlossaryTerm.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(
			translationServices.createGlossaryTerm,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.translations.error.name"),
					message: copy("server:core.routes.translations.error.message"),
				},
			},
		)(context, {
			term: body.term,
			locale: body.locale,
			translation: body.translation,
			userId: c.get("auth").id,
		});
		if (result.error) throw new LucidError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default createGlossaryTermController;
