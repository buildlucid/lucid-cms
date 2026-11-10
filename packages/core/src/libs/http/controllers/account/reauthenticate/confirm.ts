import { createFactory } from "hono/factory";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/account.js";
import {
	accountServices,
	authServices,
} from "../../../../../services/index.js";
import { LucidError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import authenticate from "../../../middleware/authenticate.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const reauthenticateController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description: `Confirms it's the authenticated user with their password, an authenticator or recovery code, or a passkey, then renews the session. Changes to how the user signs in, such as adding a passkey or changing their email, need this, or a login, within the last ${constants.reauthentication.windowSeconds / 60} minutes.`,
		tags: ["account"],
		summary: "Reauthenticate",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.reauthenticate.body),
	})),
	validateCSRF(),
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.twoFactor.limit,
		scope: constants.rateLimit.scopes.twoFactor.scopeKey,
		windowMs: 15 * 60_000,
	}),
	validate("json", controllerSchemas.reauthenticate.body),
	async (c) => {
		const proof = c.req.valid("json");
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const reauthenticateRes = await serviceWrapper(
			accountServices.reauthenticate,
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
			proof: proof,
		});
		if (reauthenticateRes.error) throw new LucidError(reauthenticateRes.error);

		const [refreshRes, accessRes] = await Promise.all([
			authServices.refreshToken.generateToken(c, auth.id),
			authServices.accessToken.generateToken(c, auth.id),
		]);
		if (refreshRes.error) throw new LucidError(refreshRes.error);
		if (accessRes.error) throw new LucidError(accessRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default reauthenticateController;
