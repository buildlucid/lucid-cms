import { createFactory } from "hono/factory";
import z from "zod";
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
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const runChecksController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Runs the requested adapter health checks in order. Failing adapters are reported in the results. The email check sends a test email to the signed-in user.",
		tags: ["diagnostics"],
		summary: "Run Diagnostics Checks",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.runChecks.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.runChecks.body),
	})),
	validateCSRF(),
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	permissions([Permissions.SettingsRead]),
	validate("json", controllerSchemas.runChecks.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const results = await serviceWrapper(diagnosticServices.runChecks, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.diagnostics.checks.error.name"),
				message: copy("server:core.routes.diagnostics.checks.error.message"),
			},
		})(context, {
			checks: body.checks,
			authUser: c.get("auth"),
		});
		if (results.error) throw new LucidAPIError(results.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: results.data,
			}),
		);
	},
);

export default runChecksController;
