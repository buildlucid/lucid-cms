import { createFactory } from "hono/factory";
import constants from "../../../../constants/constants.js";
import { authServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";

const factory = createFactory();

const tokenController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Verifies the refresh token and issues a new access and refresh token.",
		tags: ["auth"],
		summary: "Refresh Token",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
	})),
	validateCSRF(),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.refresh.limit,
		scope: constants.rateLimit.scopes.refresh.scopeKey,
		windowMs: 60_000,
	}),
	async (c) => {
		const payloadRes = await authServices.refreshToken.verifyToken(c);
		if (payloadRes.error) throw new LucidError(payloadRes.error);

		const [refreshRes, accessRes] = await Promise.all([
			authServices.refreshToken.generateToken(c, payloadRes.data.user_id, {
				authTime: payloadRes.data.authTime,
				provider: payloadRes.data.provider,
			}),
			authServices.accessToken.generateToken(
				c,
				payloadRes.data.user_id,
				payloadRes.data.authTime,
			),
		]);

		if (refreshRes.error) throw new LucidError(refreshRes.error);
		if (accessRes.error) throw new LucidError(accessRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default tokenController;
