import z from "zod";
import T from "../../../../../translations/index.js";
import { controllerSchemas } from "../../../../../schemas/documents.js";
import { headers, response } from "../../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../../utils/build-response.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import type { RouteController } from "../../../../../types/types.js";

const getMultipleController: RouteController<
	typeof controllerSchemas.client.getMultiple.params,
	typeof controllerSchemas.client.getMultiple.body,
	typeof controllerSchemas.client.getMultiple.query.string,
	typeof controllerSchemas.client.getMultiple.query.formatted
> = async (request, reply) => {
	const documents = await serviceWrapper(
		request.server.services.collection.documents.client.getMultiple,
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
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			collectionKey: request.params.collectionKey,
			status: request.params.status,
			query: request.formattedQuery,
		},
	);
	if (documents.error) throw new LucidAPIError(documents.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: documents.data.data,
			pagination: {
				count: documents.data.count,
				page: request.formattedQuery.page,
				perPage: request.formattedQuery.perPage,
			},
		}),
	);
};

export default {
	controller: getMultipleController,
	zodSchema: controllerSchemas.client.getMultiple,
	swaggerSchema: {
		description:
			"Get multilple documents by filters via the client integration.",
		tags: ["client-documents"],
		summary: "Get Multiple Documents",

		headers: headers({
			authorization: true,
			clientKey: true,
		}),
		querystring: z.toJSONSchema(
			controllerSchemas.client.getMultiple.query.string,
		),
		// body: z.toJSONSchema(controllerSchemas.client.getMultiple.body),
		params: z.toJSONSchema(controllerSchemas.client.getMultiple.params),
		response: response({
			schema: z.toJSONSchema(controllerSchemas.client.getMultiple.response),
			paginated: true,
		}),
	},
};
