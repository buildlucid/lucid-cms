import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { authServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const setupTwoFactorChallengeController = factory.createHandlers(
	describeRoute({
		description:
			"Creates an authenticator app secret for a login that has to set up two-factor authentication first, using the challenge cookie set by logging in.",
		tags: ["auth"],
		summary: "Set Up Two-Factor Login",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.setupTwoFactorChallenge.response,
			),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF(),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	async (c) => {
		const context = createServiceContext(c);

		const challengeRes = await authServices.twoFactor.getChallenge(c);
		if (challengeRes.error) throw new LucidAPIError(challengeRes.error);
		if (challengeRes.data.step !== "setup") {
			throw new LucidAPIError({
				type: "basic",
				status: 400,
				message: copy("server:core.auth.two.factor.setup.not.needed.message"),
			});
		}

		const setupRes = await serviceWrapper(authServices.twoFactor.createSecret, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.two.factor.error.name"),
				message: copy("server:core.routes.two.factor.error.message"),
			},
		})(context, {
			userId: challengeRes.data.userId,
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

export default setupTwoFactorChallengeController;
