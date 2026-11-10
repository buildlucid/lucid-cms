import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/account.js";
import { authServices } from "../../../../../services/index.js";
import { LucidError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import authenticate from "../../../middleware/authenticate.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const reauthenticateOptionsController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Creates the options for confirming it's the authenticated user with one of their passkeys, with a challenge that works once for a few minutes. Pass them to the browser, then send its response to the reauthenticate endpoint.",
		tags: ["account"],
		summary: "Reauthentication Passkey Options",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.reauthenticateOptions.response,
			),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
	})),
	validateCSRF(),
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.low.limit,
		scope: constants.rateLimit.scopes.low.scopeKey,
		windowMs: 60_000,
	}),
	async (c) => {
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const optionsRes = await serviceWrapper(
			authServices.passkeys.createLoginOptions,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.reauthenticate.error.name"),
					message: copy("server:core.routes.reauthenticate.error.message"),
				},
			},
		)(context, {
			userId: auth.id,
		});
		if (optionsRes.error) throw new LucidError(optionsRes.error);

		c.header("Cache-Control", "private, no-store");
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: optionsRes.data,
			}),
		);
	},
);

export default reauthenticateOptionsController;
