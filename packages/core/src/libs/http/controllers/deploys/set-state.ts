import { createFactory } from "hono/factory";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/deploys.js";
import { deployServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { getDeployPermission } from "../../../permission/deploy-permissions.js";
import authenticate from "../../middleware/authenticate.js";
import { permissionCheck } from "../../middleware/permissions.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const setStateController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Turns a deploy on or off. Turning it off drops its waiting triggers and queued run.",
		tags: ["deploys"],
		summary: "Set Deploy State",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({
			params: controllerSchemas.setState.params,
			headers: { csrf: true },
		}),
		requestBody: openAPI.requestBody(controllerSchemas.setState.body),
	})),
	validateCSRF(),
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	validate("param", controllerSchemas.setState.params),
	validate("json", controllerSchemas.setState.body),
	async (c) => {
		const { key } = c.req.valid("param");
		permissionCheck(c, getDeployPermission(key, "manage"));
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(deployServices.setState, {
			transaction: true,
			defaultError: {
				type: "basic",
				message: copy("server:core.deploys.state.failed"),
			},
		})(context, {
			key,
			enabled: body.enabled,
			userId: c.get("auth").id,
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default setStateController;
