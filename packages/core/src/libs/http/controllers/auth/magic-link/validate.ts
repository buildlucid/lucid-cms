import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { authServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const validateMagicLinkController = factory.createHandlers(
	describeRoute({
		description:
			"Checks a magic link's token without using it, and returns the email address of the account it logs in to.",
		tags: ["auth"],
		summary: "Validate Magic Link",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.validateMagicLink.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.validateMagicLink.params,
		}),
	}),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.standard.limit,
		scope: constants.rateLimit.scopes.standard.scopeKey,
		windowMs: 60_000,
	}),
	validate("param", controllerSchemas.validateMagicLink.params),
	async (c) => {
		const { token } = c.req.valid("param");
		const context = createServiceContext(c);
		c.header("Cache-Control", "private, no-store");
		c.header("Referrer-Policy", "no-referrer");

		const validateRes = await serviceWrapper(authServices.magicLink.validate, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.errors.default.name"),
				message: copy("server:core.errors.default.message"),
			},
		})(context, {
			token: token,
		});
		if (validateRes.error) throw new LucidAPIError(validateRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: validateRes.data,
			}),
		);
	},
);

export default validateMagicLinkController;
