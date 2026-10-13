import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/account.js";
import { accountServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updatePreferencesController = factory.createHandlers(
	describeRoute({
		description:
			"Update the authenticated user's admin preferences. Each top-level key sent replaces the stored value.",
		tags: ["account"],
		summary: "Update Preferences",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({
			headers: { csrf: true },
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updatePreferences.body),
	}),
	validateCSRF(),
	authenticate(),
	validate("json", controllerSchemas.updatePreferences.body),
	async (c) => {
		const preferences = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(accountServices.updatePreferences, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.user.preferences.update.error.name"),
				message: copy(
					"server:core.routes.user.preferences.update.error.message",
				),
			},
		})(context, {
			userId: c.get("auth").id,
			preferences,
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default updatePreferencesController;
