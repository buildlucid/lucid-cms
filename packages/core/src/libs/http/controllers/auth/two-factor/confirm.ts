import { deleteCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import z from "zod";
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
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";
import getClientAddress from "../../../utils/get-client-address.js";

const factory = createFactory();

const confirmTwoFactorChallengeController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Turns on the authenticator app set up at a login's two-factor step once its first code checks out, then sets a refresh and access token as httpOnly cookies. Returns recovery codes, which are only shown once.",
		tags: ["auth"],
		summary: "Confirm Two-Factor Login Setup",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.confirmTwoFactorChallenge.response,
			),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(
			controllerSchemas.confirmTwoFactorChallenge.body,
		),
	})),
	validateCSRF(),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	validate("json", controllerSchemas.confirmTwoFactorChallenge.body),
	async (c) => {
		const { code } = c.req.valid("json");
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
			authServices.twoFactor.confirmChallenge,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.two.factor.error.name"),
					message: copy("server:core.routes.two.factor.error.message"),
				},
			},
		)(context, {
			challengeId: challengeRes.data.id,
			userId: challengeRes.data.userId,
			code: code,
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

		c.header("Cache-Control", "private, no-store");
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: confirmRes.data,
			}),
		);
	},
);

export default confirmTwoFactorChallengeController;
