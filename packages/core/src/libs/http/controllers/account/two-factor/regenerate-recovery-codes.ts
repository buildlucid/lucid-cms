import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/account.js";
import { accountServices } from "../../../../../services/index.js";
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

const regenerateRecoveryCodesController = factory.createHandlers(
	describeRoute({
		description:
			"Replaces the authenticated user's recovery codes, after a code from their authenticator app or an old recovery code. The new codes are only shown once.",
		tags: ["account"],
		summary: "Regenerate Recovery Codes",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.regenerateRecoveryCodes.response,
			),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(
			controllerSchemas.regenerateRecoveryCodes.body,
		),
	}),
	validateCSRF(),
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.twoFactor.limit,
		scope: constants.rateLimit.scopes.twoFactor.scopeKey,
		windowMs: 15 * 60_000,
	}),
	validate("json", controllerSchemas.regenerateRecoveryCodes.body),
	async (c) => {
		const proof = c.req.valid("json");
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const regenerateRes = await serviceWrapper(
			accountServices.regenerateRecoveryCodes,
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
			proof: proof,
		});
		if (regenerateRes.error) throw new LucidAPIError(regenerateRes.error);

		c.header("Cache-Control", "private, no-store");
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: regenerateRes.data,
			}),
		);
	},
);

export default regenerateRecoveryCodesController;
