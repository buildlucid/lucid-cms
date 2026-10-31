import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { authServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import verifyCaptcha from "../../../middleware/verify-captcha.js";
import openAPI from "../../../openapi/index.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const sendMagicLinkController = factory.createHandlers(
	describeRoute({
		description:
			"Emails a login link and code to the account with this email address. The response is the same whether or not an account exists.",
		tags: ["auth"],
		summary: "Send Magic Link",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
				captcha: false,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.sendMagicLink.body),
	}),
	validateCSRF(),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	verifyCaptcha("magicLink"),
	validate("json", controllerSchemas.sendMagicLink.body),
	async (c) => {
		const { email, redirectPath } = c.req.valid("json");
		const context = createServiceContext(c);

		const sendRes = await serviceWrapper(authServices.magicLink.send, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.magic.link.send.error.name"),
				message: copy("server:core.routes.magic.link.send.error.message"),
			},
		})(context, {
			email: email,
			redirectPath: redirectPath,
		});
		if (sendRes.error) throw new LucidAPIError(sendRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default sendMagicLinkController;
