import { describeRoute } from "hono-openapi";
import { deleteCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import {
	authServices,
	userLoginServices,
} from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const verifyTwoFactorChallengeController = factory.createHandlers(
	describeRoute({
		description:
			"Checks the authenticator or recovery code entered at a login's two-factor step, using the challenge cookie set by logging in. Once it checks out, sets a refresh and access token as httpOnly cookies.",
		tags: ["auth"],
		summary: "Verify Two-Factor Login",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(
			controllerSchemas.verifyTwoFactorChallenge.body,
		),
	}),
	validateCSRF(),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	validate("json", controllerSchemas.verifyTwoFactorChallenge.body),
	async (c) => {
		const proof = c.req.valid("json");
		const context = createServiceContext(c);

		const challengeRes = await authServices.twoFactor.getChallenge(c);
		if (challengeRes.error) throw new LucidAPIError(challengeRes.error);
		if (challengeRes.data.step !== "verify") {
			throw new LucidAPIError({
				type: "basic",
				status: 400,
				message: copy("server:core.auth.two.factor.verify.not.ready.message"),
			});
		}

		const verifyRes = await serviceWrapper(
			authServices.twoFactor.verifyChallenge,
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
			proof: proof,
		});
		if (verifyRes.error) throw new LucidAPIError(verifyRes.error);

		deleteCookie(c, constants.cookies.twoFactorChallenge, { path: "/" });

		const [refreshRes, accessRes] = await Promise.all([
			authServices.refreshToken.generateToken(c, challengeRes.data.userId),
			authServices.accessToken.generateToken(c, challengeRes.data.userId),
		]);
		if (refreshRes.error) throw new LucidAPIError(refreshRes.error);
		if (accessRes.error) throw new LucidAPIError(accessRes.error);

		const connectionInfo = c.get("runtimeContext").getConnectionInfo(c);
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
			ipAddress: connectionInfo.address ?? null,
			userAgent: userAgent,
		});
		if (userLoginTrackRes.error)
			throw new LucidAPIError(userLoginTrackRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default verifyTwoFactorChallengeController;
