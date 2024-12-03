import T from "../../../translations/index.js";
import collectionDocumentsSchema from "../../../schemas/collection-documents.js";
import {
	swaggerResponse,
	swaggerQueryString,
	swaggerHeaders,
} from "../../../utils/swagger/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import CollectionDocumentsFormatter from "../../../libs/formatters/collection-documents.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import type { RouteController } from "../../../types/types.js";

const getMultipleController: RouteController<
	typeof collectionDocumentsSchema.client.getMultiple.params,
	typeof collectionDocumentsSchema.client.getMultiple.body,
	typeof collectionDocumentsSchema.client.getMultiple.query
> = async (request, reply) => {
	const documents = await serviceWrapper(
		request.server.services.collection.document.client.getMultiple,
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
			query: request.query,
		},
	);
	if (documents.error) throw new LucidAPIError(documents.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: documents.data.data,
			pagination: {
				count: documents.data.count,
				page: request.query.page,
				perPage: request.query.perPage,
			},
		}),
	);
};

export default {
	controller: getMultipleController,
	zodSchema: collectionDocumentsSchema.client.getMultiple,
	swaggerSchema: {
		description:
			"Get multilple collection documents by filters via the client integration.",
		tags: ["client-integrations", "collection-documents"],
		summary: "Get multiple collection document entries.",
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "array",
					items: CollectionDocumentsFormatter.swaggerClient,
				},
				paginated: true,
			}),
		},
		headers: swaggerHeaders({
			authorization: true,
			clientKey: true,
		}),
		querystring: swaggerQueryString({
			filters: [
				{
					key: "documentId",
				},
				{
					key: "documentCreatedBy",
				},
				{
					key: "documentUpdatedBy",
				},
				{
					key: "documentCreatedAt",
				},
				{
					key: "documentUpdatedAt",
				},
			],
			sorts: ["createdAt", "updatedAt"],
			page: true,
			perPage: true,
		}),
	},
};
