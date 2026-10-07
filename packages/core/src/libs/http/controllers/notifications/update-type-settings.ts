import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/notifications.js";
import { notificationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateTypeSettingsController = factory.createHandlers(
	describeRoute({
		description:
			"Turn a notification type on or off, toggle its emails and choose who receives it.",
		tags: ["notifications"],
		summary: "Update Notification Type Settings",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({
			params: controllerSchemas.updateTypeSettings.params,
			headers: { csrf: true },
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updateTypeSettings.body),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.SettingsUpdate]),
	validate("param", controllerSchemas.updateTypeSettings.params),
	validate("json", controllerSchemas.updateTypeSettings.body),
	async (c) => {
		const { type } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(
			notificationServices.updateTypeSettings,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.notifications.error.name"),
					message: copy("server:core.routes.notifications.error.message"),
				},
			},
		)(context, {
			type,
			enabled: body.enabled,
			email: body.email,
			roleIds: body.roleIds,
			userId: c.get("auth").id,
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateTypeSettingsController;
