import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/license.js";
import { describeRoute } from "hono-openapi";
import { licenseServices } from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const updateLicenseController = factory.createHandlers(
	describeRoute({
		description: "Saves or updates the license key.",
		tags: ["license"],
		summary: "Update License",
		responses: honoOpenAPIResponse({ noProperties: true }),
		parameters: honoOpenAPIParamaters({
			headers: { csrf: true },
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.update.body),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UpdateLicense]),
	validate("json", controllerSchemas.update.body),
	async (c) => {
		const body = c.req.valid("json");

		const updateRes = await serviceWrapper(licenseServices.updateLicense, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("default_error_name"),
				message: T("default_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				licenseKey: body.licenseKey,
			},
		);
		if (updateRes.error) throw new LucidAPIError(updateRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateLicenseController;
