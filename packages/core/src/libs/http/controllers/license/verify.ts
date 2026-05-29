import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { licenseServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { text } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import createServiceContext from "../../utils/create-service-context.js";

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
	permissions([Permissions.LicenseUpdate]),
	async (c) => {
		const context = createServiceContext(c);
		const res = await serviceWrapper(licenseServices.verifyLicense, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: text.server("core.errors.default.name"),
				message: text.server("core.errors.default.message"),
			},
		})(context);
		if (res.error) throw new LucidAPIError(res.error);

		c.status(204);
		return c.body(null);
	},
);

export default verifyLicenseController;
