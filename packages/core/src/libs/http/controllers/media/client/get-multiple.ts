import { minutesToSeconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../../schemas/media.js";
import { mediaServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import cacheKeys from "../../../../kv/cache-keys.js";
import { ClientScopes } from "../../../../permission/client-scopes.js";
import cache from "../../../middleware/cache.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";
import clientScopes from "../../../middleware/client-scopes.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import buildFormattedQuery from "../../../utils/build-formatted-query.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description:
			"Get multiple media items by filters via the client integration. Supports pagination and translated metadata.",
		tags: ["client-media"],
		summary: "Get Multiple Media",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.client.getMultiple.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.client.getMultiple.query.string,
			headers: {
				authorization: true,
			},
		}),
	}),
	clientAuthentication,
	clientScopes([ClientScopes.MediaRead]),
	validate("query", controllerSchemas.client.getMultiple.query.string),
	cache({
		ttl: minutesToSeconds(5),
		mode: "include-query",
		tags: [cacheKeys.http.tags.clientMedia],
		keyContext: (c) => {
			const tenantKey = c.get("tenant")?.key;
			return tenantKey ? { tenant: tenantKey } : {};
		},
	}),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.client.getMultiple.query.formatted,
			{
				nullableFields: ["folderId"],
			},
		);
		const context = createServiceContext(c);

		const media = await serviceWrapper(mediaServices.client.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.media.fetch.error.name"),
				message: copy("server:core.routes.media.fetch.error.message"),
			},
		})(context, {
			query: formattedQuery,
		});
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
