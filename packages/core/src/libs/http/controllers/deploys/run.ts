import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
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
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const runController = factory.createHandlers(
	describeRoute({
		description:
			"Runs a deploy now, or queues it behind the run in progress, taking any waiting triggers with it.",
		tags: ["deploys"],
		summary: "Run Deploy",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.run.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.run.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF(),
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	validate("param", controllerSchemas.run.params),
	async (c) => {
		const { key } = c.req.valid("param");
		permissionCheck(c, getDeployPermission(key, "run"));
		const context = createServiceContext(c);

		const run = await serviceWrapper(deployServices.run, {
			transaction: true,
			defaultError: {
				type: "basic",
				message: copy("server:core.deploys.run.failed"),
			},
		})(context, {
			key,
			source: "manual",
			userId: c.get("auth").id,
		});
		if (run.error) throw new LucidAPIError(run.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: run.data }));
	},
);

export default runController;
