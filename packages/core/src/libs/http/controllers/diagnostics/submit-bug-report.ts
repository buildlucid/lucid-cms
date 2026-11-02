import { describeRoute } from "hono-openapi";
import { bodyLimit } from "hono/body-limit";
import { createFactory } from "hono/factory";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/diagnostics.js";
import { diagnosticServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

//* base64 grows images by a third, plus room for the message and diagnostics
const MAX_BODY_BYTES =
	Math.ceil(
		(constants.bugReports.maxImages * constants.bugReports.maxImageBytes * 4) /
			3,
	) +
	1024 * 1024;

const factory = createFactory();

const submitBugReportController = factory.createHandlers(
	describeRoute({
		description:
			"Sends a bug report to Lucid through the CMS's Lucid connection, with optional diagnostics and images. Lucid replies to the connected organisation's account email.",
		tags: ["diagnostics"],
		summary: "Submit Bug Report",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.submitBugReport.body),
	}),
	validateCSRF(),
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	permissions([Permissions.SettingsRead]),
	bodyLimit({
		maxSize: MAX_BODY_BYTES,
		onError: () => {
			throw new LucidAPIError({
				type: "basic",
				status: 413,
				name: copy("server:core.routes.diagnostics.bug.report.error.name"),
				message: copy("server:core.routes.diagnostics.bug.report.too.large"),
			});
		},
	}),
	validate("json", controllerSchemas.submitBugReport.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(diagnosticServices.submitBugReport, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.diagnostics.bug.report.error.name"),
				message: copy(
					"server:core.routes.diagnostics.bug.report.error.message",
				),
			},
		})(context, body);
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default submitBugReportController;
