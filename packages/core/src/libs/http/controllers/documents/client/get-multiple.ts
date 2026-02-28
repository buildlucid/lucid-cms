import { hoursToSeconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../../schemas/documents.js";
import { documentServices } from "../../../../../services/index.js";
import T from "../../../../../translations/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import cacheKeys from "../../../../kv-adapter/cache-keys.js";
import { ClientScopes } from "../../../../permission/client-scopes.js";
import cache from "../../../middleware/cache.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";
import clientScopes from "../../../middleware/client-scopes.js";
import validate from "../../../middleware/validate.js";
import buildFormattedQuery from "../../../utils/build-formatted-query.js";
import formatAPIResponse from "../../../utils/build-response.js";
import getServiceContext from "../../../utils/get-service-context.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description:
			"Get multiple documents by filters via the client integration.",
		tags: ["client-documents"],
		summary: "Get Multiple Documents",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.client.getMultiple.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
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
		tags: (c) => [
			cacheKeys.http.tags.clientDocuments,
			cacheKeys.http.tags.clientDocumentsCollection(
				c.req.param("collectionKey"),
			),
		],
	}),
	async (c) => {
		const { collectionKey, status } = c.req.valid("param");
		const context = getServiceContext(c);
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
					name: T("route_document_fetch_error_name"),
					message: T("route_document_fetch_error_message"),
				},
			},
		)(context, {
			collectionKey,
			status,
			query: formattedQuery,
		});
		if (documents.error) throw new LucidAPIError(documents.error);

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
