import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { authServices } from "../../../../../services/index.js";
import T from "../../../../../translations/index.js";
import type { LucidHonoContext } from "../../../../../types/hono.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import formatAPIResponse from "../../../utils/build-response.js";
import getServiceContext from "../../../utils/get-service-context.js";

const factory = createFactory();

const getProvidersController = factory.createHandlers(
	describeRoute({
		description: "Get all available authentication providers.",
		tags: ["auth"],
		summary: "Get Auth Providers",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getProviders.response),
		}),
	}),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.standard.limit,
		scope: constants.rateLimit.scopes.standard.scopeKey,
		windowMs: minutesToMilliseconds(1),
	}),
	async (c: LucidHonoContext) => {
		const context = getServiceContext(c);
		const providersRes = await serviceWrapper(
			authServices.providers.getProviders,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_providers_error_name"),
					message: T("route_providers_error_message"),
				},
			},
		)(context);
		if (providersRes.error) throw new LucidAPIError(providersRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: providersRes.data,
			}),
		);
	},
);

export default getProvidersController;
