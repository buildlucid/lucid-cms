import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/settings.js";
import { settingServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateSystemAlertsController = factory.createHandlers(
	describeRoute({
		description: "Updates system alert settings.",
		tags: ["settings"],
		summary: "Update System Alerts",
		responses: honoOpenAPIResponse({ noProperties: true }),
		parameters: honoOpenAPIParamaters({
			headers: { csrf: true },
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.updateSystemAlerts.body,
		),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.SettingsUpdate]),
	validate("json", controllerSchemas.updateSystemAlerts.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const updateRes = await serviceWrapper(settingServices.updateSystemAlerts, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("default_error_name"),
				message: T("default_error_message"),
			},
		})(context, {
			alertEmail: body.alertEmail,
		});
		if (updateRes.error) throw new LucidAPIError(updateRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateSystemAlertsController;
