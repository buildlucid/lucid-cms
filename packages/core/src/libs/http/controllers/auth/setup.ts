import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/auth.js";
import { userServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const setupController = factory.createHandlers(
	describeRoute({
		description:
			"Creates the initial admin user. This endpoint can only be used when no users exist in the system. Even if password auth is disabled, you will still be required to set one here.",
		tags: ["auth"],
		summary: "Initial Admin Setup",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.setup.body),
	}),
	validateCSRF,
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: minutesToMilliseconds(1),
	}),
	validate("json", controllerSchemas.setup.body),
	async (c) => {
		const { email, username, firstName, lastName, password } =
			c.req.valid("json");
		const context = createServiceContext(c);

		const createAdminRes = await serviceWrapper(
			userServices.createInitialAdmin,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.user.create.error.name"),
					message: copy("server:core.routes.user.create.error.message"),
				},
			},
		)(context, {
			email,
			username,
			firstName,
			lastName,
			password,
		});
		if (createAdminRes.error) throw new LucidAPIError(createAdminRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default setupController;
