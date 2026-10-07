import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/notifications.js";
import { notificationServices } from "../../../../services/index.js";
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
		description: "Choose which notification types email you.",
		tags: ["notifications"],
		summary: "Update Notification Preferences",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({
			headers: { csrf: true },
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updatePreferences.body),
	}),
	validateCSRF,
	authenticate(),
	validate("json", controllerSchemas.updatePreferences.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(
			notificationServices.updatePreferences,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.notifications.error.name"),
					message: copy("server:core.routes.notifications.error.message"),
				},
			},
		)(context, {
			userId: c.get("auth").id,
			preferences: body.preferences,
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default updatePreferencesController;
