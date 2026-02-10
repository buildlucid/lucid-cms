import { randomUUID } from "node:crypto";
import { minutesToMilliseconds } from "date-fns";
import { setCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/share.js";
import { mediaShareLinkServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import createAuthCookieName from "../../../../utils/share-link/auth-cookie.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

/**
 * Authorize access to a password-protected share link by validating the provided password
 * and setting a session cookie if valid.
 */
const authorizeStreamController = factory.createHandlers(
	describeRoute({
		description: "Validate share password and set a session cookie.",
		tags: ["share"],
		summary: "Authorize Stream",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.authorizeShare.params,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.authorizeShare.body),
	}),
	rateLimiter({
		mode: "ip",
		scope: constants.rateLimit.scopes.low.scopeKey,
		limit: constants.rateLimit.scopes.low.limit,
		windowMs: minutesToMilliseconds(1),
	}),
	validate("param", controllerSchemas.authorizeShare.params),
	validate("json", controllerSchemas.authorizeShare.body),
	async (c) => {
		const { token } = c.req.valid("param");
		const { password } = c.req.valid("json");
		const context = getServiceContext(c);

		const authorizeRes = await serviceWrapper(
			mediaShareLinkServices.authorizeShare,
			{ transaction: false },
		)(context, { token, providedPassword: password });
		if (authorizeRes.error) throw new LucidAPIError(authorizeRes.error);

		const cookieName = createAuthCookieName(token);
		setCookie(c, cookieName, randomUUID(), {
			maxAge: constants.shareLinkExpiration,
			httpOnly: true,
			secure: c.req.url.startsWith("https://"),
			sameSite: "strict",
			path: `/${constants.directories.base}`,
		});

		return c.json({ success: true }, 200);
	},
);

export default authorizeStreamController;
