import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod/v4";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/locales.js";
import { localeServices } from "../../../../../services/index.js";
import T from "../../../../../translations/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import cacheKeys from "../../../../kv-adapter/cache-keys.js";
import cache from "../../../middleware/cache.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";
import formatAPIResponse from "../../../utils/build-response.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns all enabled locales via the client integration.",
		tags: ["client-locales"],
		summary: "Get All Locales",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.client.getAll.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				authorization: true,
			},
		}),
		validateResponse: true,
	}),
	clientAuthentication,
	cache({
		ttl: constants.ttl["24-hours"],
		mode: "static",
		staticKey: cacheKeys.http.static.clientLocales,
	}),
	async (c) => {
		const locales = await serviceWrapper(localeServices.getAll, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_locale_fetch_error_name"),
				message: T("route_locale_fetch_error_message"),
			},
		})({
			db: c.get("config").db.client,
			config: c.get("config"),
			queue: c.get("queue"),
			env: c.get("env"),
			kv: c.get("kv"),
		});
		if (locales.error) throw new LucidAPIError(locales.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: locales.data,
			}),
		);
	},
);

export default getAllController;
