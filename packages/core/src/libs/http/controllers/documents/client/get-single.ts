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
import cache from "../../../middleware/cache.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";
import validate from "../../../middleware/validate.js";
import buildFormattedQuery from "../../../utils/build-formatted-query.js";
import formatAPIResponse from "../../../utils/build-response.js";
import getServiceContext from "../../../utils/get-service-context.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Get a single document by filters via the client integration.",
		tags: ["client-documents"],
		summary: "Get Document",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.client.getSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.client.getSingle.params,
			query: controllerSchemas.client.getSingle.query.string,
			headers: {
				authorization: true,
			},
		}),
	}),
	clientAuthentication,
	validate("param", controllerSchemas.client.getSingle.params),
	validate("query", controllerSchemas.client.getSingle.query.string),
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
			controllerSchemas.client.getSingle.query.formatted,
		);

		const document = await serviceWrapper(documentServices.client.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_document_fetch_error_name"),
				message: T("route_document_fetch_error_message"),
			},
		})(context, {
			collectionKey,
			status,
			query: formattedQuery,
		});
		if (document.error) throw new LucidAPIError(document.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: document.data,
			}),
		);
	},
);

export default getSingleController;
