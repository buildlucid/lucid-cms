import { hoursToSeconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../../schemas/documents.js";
import { documentServices } from "../../../../../services/index.js";
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
			"Get multiple documents by filters via the client integration.",
		tags: ["client-documents"],
		summary: "Get Multiple Documents",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.client.getMultiple.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.client.getMultiple.params,
			query: controllerSchemas.client.getMultiple.query.string,
			headers: {
				authorization: true,
			},
		}),
	}),
	clientAuthentication,
	clientScopes([ClientScopes.DocumentsRead]),
	validate("param", controllerSchemas.client.getMultiple.params),
	validate("query", controllerSchemas.client.getMultiple.query.string),
	cache({
		ttl: hoursToSeconds(24),
		mode: "include-query",
		bypass: (c) => c.req.query("preview") !== undefined,
		tags: (c) => {
			const collectionKey = c.req.param("collectionKey");
			const tags: string[] = [cacheKeys.http.tags.clientDocuments];
			if (collectionKey) {
				tags.push(cacheKeys.http.tags.clientDocumentsCollection(collectionKey));
			}
			return tags;
		},
		keyContext: (c) => {
			const tenantKey = c.get("tenant")?.key;
			return tenantKey ? { tenant: tenantKey } : {};
		},
	}),
	async (c) => {
		const { collectionKey } = c.req.valid("param");
		const { preview, version, versionId } = c.req.valid("query");

		const context = createServiceContext(c);
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.client.getMultiple.query.formatted,
		);

		const documents = await serviceWrapper(
			documentServices.client.getMultiple,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.document.fetch.error.name"),
					message: copy("server:core.routes.document.fetch.error.message"),
				},
			},
		)(context, {
			collectionKey,
			versionType: version,
			versionId,
			preview,
			query: formattedQuery,
		});
		if (documents.error) throw new LucidAPIError(documents.error);

		if (preview !== undefined) {
			c.header("Cache-Control", "private, no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
		}

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: documents.data.data,
				pagination: {
					count: documents.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
