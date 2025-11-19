import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod/v4";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/media.js";
import { mediaServices } from "../../../../../services/index.js";
import T from "../../../../../translations/index.js";
import cacheKeys from "../../../../kv-adapter/cache-keys.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import cache from "../../../middleware/cache.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";
import contentLocale from "../../../middleware/content-locale.js";
import validate from "../../../middleware/validate.js";
import buildFormattedQuery from "../../../utils/build-formatted-query.js";
import formatAPIResponse from "../../../utils/build-response.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description:
			"Get multiple media items by filters via the client integration. Supports pagination and translated metadata.",
		tags: ["client-media"],
		summary: "Get Multiple Media",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.client.getMultiple.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.client.getMultiple.query.string,
			headers: {
				authorization: true,
				contentLocale: true,
			},
		}),
		validateResponse: true,
	}),
	clientAuthentication,
	contentLocale,
	validate("query", controllerSchemas.client.getMultiple.query.string),
	cache({
		ttl: constants.ttl["5-minutes"],
		mode: "include-query",
		includeHeaders: [constants.headers.contentLocale],
		tags: [cacheKeys.http.tags.clientMedia],
	}),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.client.getMultiple.query.formatted,
			{
				nullableFields: ["folderId"],
			},
		);

		const media = await serviceWrapper(mediaServices.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_media_fetch_error_name"),
				message: T("route_media_fetch_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				query: formattedQuery,
				localeCode: c.get("locale").code,
			},
		);
		if (media.error) throw new LucidAPIError(media.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: media.data.data,
				pagination: {
					count: media.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
