import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/auth.js";
import { authServices, userLoginServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import verifyCaptcha from "../../middleware/verify-captcha.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const loginController = factory.createHandlers(
	describeRoute({
		description:
			"Authenticates a user and sets a refresh and access token as httpOnly cookies. When a two-factor step is needed, it sets a short-lived challenge cookie instead, and the session waits until the step is done.",
		tags: ["auth"],
		summary: "Login",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.login.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
				captcha: false,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.login.body),
	}),
	validateCSRF(),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	verifyCaptcha("login"),
	validate("json", controllerSchemas.login.body),
	async (c) => {
		const { usernameOrEmail, password } = c.req.valid("json");
		const context = createServiceContext(c);

		const userRes = await serviceWrapper(authServices.login, {
			transaction: false,
			defaultError: {
				type: "basic",
				code: "login",
				name: copy("server:core.routes.login.error.name"),
				message: copy("server:core.routes.login.error.message"),
			},
		})(context, {
			usernameOrEmail: usernameOrEmail,
			password: password,
		});
		if (userRes.error) throw new LucidAPIError(userRes.error);

		const challengeRes = await authServices.twoFactor.startChallenge(c, {
			userId: userRes.data.id,
			authMethod: "password",
		});
		if (challengeRes.error) throw new LucidAPIError(challengeRes.error);
		if (challengeRes.data) {
			c.status(200);
			return c.json(
				formatAPIResponse(c, {
					data: { twoFactor: challengeRes.data.step },
				}),
			);
		}

		const [refreshRes, accessRes] = await Promise.all([
			authServices.refreshToken.generateToken(c, userRes.data.id),
			authServices.accessToken.generateToken(c, userRes.data.id),
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
			userId: userRes.data.id,
			tokenId: refreshRes.data.tokenId,
			authMethod: "password",
			ipAddress: connectionInfo.address ?? null,
			userAgent: userAgent,
		});
		if (userLoginTrackRes.error)
			throw new LucidAPIError(userLoginTrackRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: { twoFactor: null },
			}),
		);
	},
);

export default loginController;
