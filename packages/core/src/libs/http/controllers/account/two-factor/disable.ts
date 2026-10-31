import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
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
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const disableTwoFactorController = factory.createHandlers(
	describeRoute({
		description:
			"Turns off two-factor authentication for the authenticated user, after a code from their authenticator app or a recovery code. Not allowed when two-factor authentication is required.",
		tags: ["account"],
		summary: "Turn Off Two-Factor Authentication",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.disableTwoFactor.body),
	}),
	validateCSRF(),
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.twoFactor.limit,
		scope: constants.rateLimit.scopes.twoFactor.scopeKey,
		windowMs: 15 * 60_000,
	}),
	validate("json", controllerSchemas.disableTwoFactor.body),
	async (c) => {
		const proof = c.req.valid("json");
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const disableRes = await serviceWrapper(accountServices.disableTwoFactor, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.two.factor.error.name"),
				message: copy("server:core.routes.two.factor.error.message"),
			},
		})(context, {
			userId: auth.id,
			superAdmin: auth.superAdmin,
			proof: proof,
		});
		if (disableRes.error) throw new LucidAPIError(disableRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default disableTwoFactorController;
