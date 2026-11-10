import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { authServices } from "../../../../../services/index.js";
import { LucidError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const passkeyTwoFactorOptionsController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Creates the options for answering a login's two-factor step with one of the user's passkeys, using the challenge cookie set by logging in.",
		tags: ["auth"],
		summary: "Two-Factor Passkey Options",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.passkeyTwoFactorOptions.response,
			),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
	})),
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
		if (challengeRes.error) throw new LucidError(challengeRes.error);
		if (
			challengeRes.data.step !== "verify" ||
			!challengeRes.data.methods.passkey
		) {
			throw new LucidError({
				type: "basic",
				status: 400,
				message: copy(
					"server:core.auth.two.factor.passkey.unavailable.message",
				),
			});
		}

		const optionsRes = await serviceWrapper(
			authServices.passkeys.createLoginOptions,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.two.factor.error.name"),
					message: copy("server:core.routes.two.factor.error.message"),
				},
			},
		)(context, {
			userId: challengeRes.data.userId,
		});
		if (optionsRes.error) throw new LucidError(optionsRes.error);

		c.header("Cache-Control", "private, no-store");
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: optionsRes.data,
			}),
		);
	},
);

export default passkeyTwoFactorOptionsController;
