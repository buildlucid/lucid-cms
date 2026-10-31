import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/account.js";
import { accountServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import authenticate from "../../../middleware/authenticate.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const startTwoFactorSetupController = factory.createHandlers(
	describeRoute({
		description:
			"Creates an authenticator app secret for the authenticated user to confirm with a code. Replacing an app that's already set up needs a code from it, or a recovery code.",
		tags: ["account"],
		summary: "Start Two-Factor Setup",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.startTwoFactorSetup.response,
			),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(
			controllerSchemas.startTwoFactorSetup.body,
		),
	}),
	validateCSRF(),
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.twoFactor.limit,
		scope: constants.rateLimit.scopes.twoFactor.scopeKey,
		windowMs: 15 * 60_000,
	}),
	validate("json", controllerSchemas.startTwoFactorSetup.body),
	async (c) => {
		const { code, recoveryCode } = c.req.valid("json");
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const setupRes = await serviceWrapper(accountServices.startTwoFactorSetup, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.two.factor.error.name"),
				message: copy("server:core.routes.two.factor.error.message"),
			},
		})(context, {
			userId: auth.id,
			proof:
				recoveryCode !== undefined
					? { recoveryCode }
					: code !== undefined
						? { code }
						: undefined,
		});
		if (setupRes.error) throw new LucidAPIError(setupRes.error);

		c.header("Cache-Control", "private, no-store");
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: setupRes.data,
			}),
		);
	},
);

export default startTwoFactorSetupController;
