import { deleteCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import {
	authServices,
	userLoginServices,
} from "../../../../../services/index.js";
import { LucidError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import createServiceContext from "../../../utils/create-service-context.js";
import getClientAddress from "../../../utils/get-client-address.js";

const factory = createFactory();

const passkeyTwoFactorConfirmController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Finishes a login's two-factor setup by adding a passkey instead of an authenticator app, using the challenge cookie set by logging in. Once it's saved, sets a refresh and access token as httpOnly cookies.",
		tags: ["auth"],
		summary: "Confirm Two-Factor Passkey",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(
			controllerSchemas.passkeyTwoFactorConfirm.body,
		),
	})),
	validateCSRF(),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	validate("json", controllerSchemas.passkeyTwoFactorConfirm.body),
	async (c) => {
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const challengeRes = await authServices.twoFactor.getChallenge(c);
		if (challengeRes.error) throw new LucidError(challengeRes.error);
		if (challengeRes.data.step !== "setup") {
			throw new LucidError({
				type: "basic",
				status: 400,
				message: copy("server:core.auth.two.factor.setup.not.needed.message"),
			});
		}

		const confirmRes = await serviceWrapper(
			authServices.twoFactor.confirmPasskey,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.two.factor.error.name"),
					message: copy("server:core.routes.two.factor.error.message"),
				},
			},
		)(context, {
			challengeId: challengeRes.data.id,
			userId: challengeRes.data.userId,
			response: body,
		});
		if (confirmRes.error) throw new LucidError(confirmRes.error);

		deleteCookie(c, constants.cookies.twoFactorChallenge, { path: "/" });

		const [refreshRes, accessRes] = await Promise.all([
			authServices.refreshToken.generateToken(c, challengeRes.data.userId),
			authServices.accessToken.generateToken(c, challengeRes.data.userId),
		]);
		if (refreshRes.error) throw new LucidError(refreshRes.error);
		if (accessRes.error) throw new LucidError(accessRes.error);

		const userAgent = c.req.header("user-agent") || null;

		const userLoginTrackRes = await serviceWrapper(
			userLoginServices.createSingle,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.login.error.name"),
					message: copy("server:core.routes.login.error.message"),
				},
			},
		)(context, {
			userId: challengeRes.data.userId,
			tokenId: refreshRes.data.tokenId,
			authMethod: challengeRes.data.authMethod,
			ipAddress: getClientAddress(c),
			userAgent: userAgent,
		});
		if (userLoginTrackRes.error) throw new LucidError(userLoginTrackRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default passkeyTwoFactorConfirmController;
