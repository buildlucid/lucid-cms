import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/license.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
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
	permissions(["update_license"]),
	validate("json", controllerSchemas.update.body),
	async (c) => {
		const body = c.req.valid("json");

		const updateRes = await serviceWrapper(services.license.updateLicense, {
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
