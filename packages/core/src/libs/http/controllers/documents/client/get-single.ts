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

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Get a single document by filters via the client integration.",
		tags: ["client-documents"],
		summary: "Get Document",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.client.getSingle.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.client.getSingle.params,
			query: controllerSchemas.client.getSingle.query.string,
			headers: {
				authorization: true,
			},
		}),
	}),
	clientAuthentication,
	clientScopes([ClientScopes.DocumentsRead]),
	validate("param", controllerSchemas.client.getSingle.params),
	validate("query", controllerSchemas.client.getSingle.query.string),
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
		const { preview, status = "latest", versionId } = c.req.valid("query");

		const context = createServiceContext(c);
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.client.getSingle.query.formatted,
		);

		const document = await serviceWrapper(documentServices.client.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.fetch.error.name"),
				message: copy("server:core.routes.document.fetch.error.message"),
			},
		})(context, {
			collectionKey,
			target:
				preview !== undefined
					? { type: "preview", token: preview }
					: { type: "version", versionType: status, versionId },
			query: formattedQuery,
		});
		if (document.error) throw new LucidAPIError(document.error);

		if (preview !== undefined) {
			c.header("Cache-Control", "private, no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
		}

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: document.data,
			}),
		);
	},
);

export default getSingleController;
