import { setCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/share.js";
import { mediaShareLinkServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import { isRequestSecure } from "../../../../utils/helpers/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import createAuthCookieName from "../../../../utils/share-link/auth-cookie.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import verifyCaptcha from "../../middleware/verify-captcha.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

/** Validates share access and sets a session cookie after a correct password. */
const authorizeStreamController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description: "Validate share password and set a session cookie.",
		tags: ["share"],
		summary: "Authorize Stream",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: {
				captcha: false,
			},
			params: controllerSchemas.authorizeShare.params,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.authorizeShare.body),
	})),
	rateLimiter({
		mode: "ip",
		scope: constants.rateLimit.scopes.low.scopeKey,
		limit: constants.rateLimit.scopes.low.limit,
		windowMs: 60_000,
	}),
	verifyCaptcha("sharePassword"),
	validate("param", controllerSchemas.authorizeShare.params),
	validate("json", controllerSchemas.authorizeShare.body),
	async (c) => {
		const { token } = c.req.valid("param");
		const { password } = c.req.valid("json");
		const context = createServiceContext(c);

		const authorizeRes = await serviceWrapper(
			mediaShareLinkServices.authorizeShare,
			{ transaction: false },
		)(context, { token, providedPassword: password });
		if (authorizeRes.error) throw new LucidError(authorizeRes.error);

		//* links without a password, or with a session already, have nothing to store
		if (authorizeRes.data.session) {
			setCookie(c, createAuthCookieName(token), authorizeRes.data.session, {
				maxAge: constants.shareLinkExpiration,
				httpOnly: true,
				secure: isRequestSecure(c),
				sameSite: "strict",
				path: `${constants.paths.api}/v1/share`,
			});
		}

		return c.json({ success: true }, 200);
	},
);

export default authorizeStreamController;
