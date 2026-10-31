import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/account.js";
import { authServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import authenticate from "../../../middleware/authenticate.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const confirmTwoFactorController = factory.createHandlers(
	describeRoute({
		description:
			"Turns on the authenticated user's new authenticator app once its first code checks out, replacing any app set up before. Returns new recovery codes, which are only shown once.",
		tags: ["account"],
		summary: "Confirm Two-Factor Setup",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.confirmTwoFactor.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.confirmTwoFactor.body),
	}),
	validateCSRF(),
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.twoFactor.limit,
		scope: constants.rateLimit.scopes.twoFactor.scopeKey,
		windowMs: 15 * 60_000,
	}),
	validate("json", controllerSchemas.confirmTwoFactor.body),
	async (c) => {
		const { code } = c.req.valid("json");
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const confirmRes = await serviceWrapper(
			authServices.twoFactor.activateSecret,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.two.factor.error.name"),
					message: copy("server:core.routes.two.factor.error.message"),
				},
			},
		)(context, {
			userId: auth.id,
			code: code,
		});
		if (confirmRes.error) throw new LucidAPIError(confirmRes.error);

		c.header("Cache-Control", "private, no-store");
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: confirmRes.data,
			}),
		);
	},
);

export default confirmTwoFactorController;
