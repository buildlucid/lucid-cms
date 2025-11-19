import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod/v4";
import { controllerSchemas } from "../../../../../schemas/documents.js";
import { documentServices } from "../../../../../services/index.js";
import T from "../../../../../translations/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import cache from "../../../middleware/cache.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";
import validate from "../../../middleware/validate.js";
import buildFormattedQuery from "../../../utils/build-formatted-query.js";
import formatAPIResponse from "../../../utils/build-response.js";

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
		validateResponse: true,
	}),
	clientAuthentication,
	validate("param", controllerSchemas.client.getMultiple.params),
	validate("query", controllerSchemas.client.getMultiple.query.string),
	// TODO: Re-enable when the cache clear is implemented. Also create a new group keys helper
	// cache({
	// 	ttl: 60 * 60 * 24,
	// 	mode: "include-query",
	// 	tags: (c) => [
	// 		"documents",
	// 		`document:${c.req.param("collectionKey")}:${c.req.param("status")}`,
	// 	],
	// }),
	async (c) => {
		const { collectionKey, status } = c.req.valid("param");
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
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				collectionKey,
				status,
				query: formattedQuery,
			},
		);
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
