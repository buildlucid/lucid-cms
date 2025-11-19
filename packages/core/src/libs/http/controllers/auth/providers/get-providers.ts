import { z } from "zod/v4";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { authServices } from "../../../../../services/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import { honoOpenAPIResponse } from "../../../../../utils/open-api/index.js";
import T from "../../../../../translations/index.js";
import type { LucidHonoContext } from "../../../../../types/hono.js";

const factory = createFactory();

const getProvidersController = factory.createHandlers(
	describeRoute({
		description: "Get all available authentication providers.",
		tags: ["auth"],
		summary: "Get Auth Providers",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getProviders.response),
		}),
		validateResponse: true,
	}),
	async (c: LucidHonoContext) => {
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
		)({
			db: c.get("config").db.client,
			config: c.get("config"),
			queue: c.get("queue"),
			env: c.get("env"),
			kv: c.get("kv"),
		});
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
