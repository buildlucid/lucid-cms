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
import { getCollectionExternalScope } from "../../../../permission/external-scopes.js";
import cache from "../../../middleware/cache.js";
import externalAuthentication from "../../../middleware/external-authenticate.js";
import externalScopes from "../../../middleware/external-scopes.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import buildFormattedQuery from "../../../utils/build-formatted-query.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Get a single document by filters via an external credential.",
		tags: ["content-documents"],
		summary: "Get Document",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.content.getSingle.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.content.getSingle.params,
			query: controllerSchemas.content.getSingle.query.string,
			headers: {
				authorization: true,
			},
		}),
	}),
	externalAuthentication(),
	validate("param", controllerSchemas.content.getSingle.params),
	externalScopes((c) => [
		getCollectionExternalScope(c.req.param("collectionKey") ?? ""),
	]),
	validate("query", controllerSchemas.content.getSingle.query.string),
	cache({
		ttl: hoursToSeconds(24),
		mode: "include-query",
		bypass: (c) => c.req.query("preview") !== undefined,
		tags: (c) => {
			const collectionKey = c.req.param("collectionKey");
			const tags: string[] = [cacheKeys.http.tags.contentDocuments];
			if (collectionKey) {
				tags.push(
					cacheKeys.http.tags.contentDocumentsCollection(collectionKey),
				);
			}
			return tags;
		},
		keyContext: (c) => {
			const auth = c.get("externalAuth");
			return {
				principal:
					auth.principal.type === "user"
						? `user:${auth.principal.userId}`
						: "system",
				scopes: [...auth.scopes].sort(),
			};
		},
	}),
	async (c) => {
		const { collectionKey } = c.req.valid("param");
		const { preview, version } = c.req.valid("query");

		const context = createServiceContext(c);
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.content.getSingle.query.formatted,
		);

		const document = await serviceWrapper(documentServices.content.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.fetch.error.name"),
				message: copy("server:core.routes.document.fetch.error.message"),
			},
		})(context, {
			collectionKey,
			versionType: version,
			preview,
			query: formattedQuery,
			externalScopes: c.get("externalAuth").scopes,
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
