import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import {
	controllerSchemas,
	userIntegrationItemParamsSchema,
} from "../../../../../schemas/integrations.js";
import { integrationServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import { Permissions } from "../../../../permission/definitions.js";
import hasAccess from "../../../../permission/has-access.js";
import authenticate from "../../../middleware/authenticate.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validate from "../../../middleware/validate.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const regenerateKeysController = factory.createHandlers(
	describeRoute({
		description:
			"Regenerates the API key for an integration owned by the selected user.",
		tags: ["integrations"],
		summary: "Regenerate User Integration Key",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.regenerateKeys.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: userIntegrationItemParamsSchema,
		}),
	}),
	validateCSRF,
	authenticate(),
	rateLimiter({
		mode: "user",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: minutesToMilliseconds(1),
	}),
	validate("param", userIntegrationItemParamsSchema),
	async (c) => {
		const { id, userId } = c.req.valid("param");
		const auth = c.get("auth");
		if (
			!hasAccess({
				user: auth,
				resourceOwnerId: userId,
				requiredPermissions: [Permissions.UsersUpdate],
			})
		) {
			throw new LucidAPIError({ type: "authorisation", status: 403 });
		}
		const context = createServiceContext(c);

		const regenerateKeysRes = await serviceWrapper(
			integrationServices.regenerateKeys,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.integrations.update.error.name"),
					message: copy("server:core.routes.integrations.update.error.message"),
				},
			},
		)(context, {
			id,
			userId,
		});
		if (regenerateKeysRes.error)
			throw new LucidAPIError(regenerateKeysRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: regenerateKeysRes.data,
			}),
		);
	},
);

export default regenerateKeysController;
