import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { authServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";

const factory = createFactory();

const getTwoFactorChallengeController = factory.createHandlers(
	describeRoute({
		description:
			"Returns the two-factor step the current login is waiting on, using the challenge cookie set by logging in.",
		tags: ["auth"],
		summary: "Get Two-Factor Login",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.getTwoFactorChallenge.response,
			),
		}),
	}),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.standard.limit,
		scope: constants.rateLimit.scopes.standard.scopeKey,
		windowMs: 60_000,
	}),
	async (c) => {
		const challengeRes = await authServices.twoFactor.getChallenge(c);
		if (challengeRes.error) throw new LucidAPIError(challengeRes.error);

		c.header("Cache-Control", "private, no-store");
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: { step: challengeRes.data.step },
			}),
		);
	},
);

export default getTwoFactorChallengeController;
