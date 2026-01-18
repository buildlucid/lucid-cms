import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { licenseServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";

const factory = createFactory();

const verifyLicenseController = factory.createHandlers(
	describeRoute({
		description: "Verifies the license with Lucid API and updates options.",
		tags: ["license"],
		summary: "Verify License",
		responses: honoOpenAPIResponse({ noProperties: true }),
		parameters: honoOpenAPIParamaters({
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate,
	async (c) => {
		const res = await serviceWrapper(licenseServices.verifyLicense, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("default_error_name"),
				message: T("default_error_message"),
			},
		})({
			db: c.get("config").db,
			config: c.get("config"),
			queue: c.get("queue"),
			env: c.get("env"),
			kv: c.get("kv"),
		});
		if (res.error) throw new LucidAPIError(res.error);

		c.status(204);
		return c.body(null);
	},
);

export default verifyLicenseController;
