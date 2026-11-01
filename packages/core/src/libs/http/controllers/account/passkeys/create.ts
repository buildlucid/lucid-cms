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
import recentAuthentication from "../../../middleware/recent-authentication.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const createPasskeyController = factory.createHandlers(
	describeRoute({
		description:
			"Adds a passkey to the authenticated user's account from the browser's response to the passkey setup options. It's named after its provider, such as Apple Passwords.",
		tags: ["account"],
		summary: "Add Passkey",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.createPasskey.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.createPasskey.body),
	}),
	validateCSRF(),
	authenticate(),
	recentAuthentication(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	validate("json", controllerSchemas.createPasskey.body),
	async (c) => {
		const body = c.req.valid("json");
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const passkeyRes = await serviceWrapper(authServices.passkeys.register, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.passkeys.error.name"),
				message: copy("server:core.routes.passkeys.error.message"),
			},
		})(context, {
			userId: auth.id,
			response: body,
		});
		if (passkeyRes.error) throw new LucidAPIError(passkeyRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: passkeyRes.data,
			}),
		);
	},
);

export default createPasskeyController;
