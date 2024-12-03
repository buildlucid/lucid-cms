import T from "../../translations/index.js";
import collectionDocumentsSchema from "../../schemas/collection-documents.js";
import {
	swaggerResponse,
	swaggerQueryString,
} from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import CollectionDocumentsFormatter from "../../libs/formatters/collection-documents.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getMultipleController: RouteController<
	typeof collectionDocumentsSchema.getMultiple.params,
	typeof collectionDocumentsSchema.getMultiple.body,
	typeof collectionDocumentsSchema.getMultiple.query
> = async (request, reply) => {
	const documents = await serviceWrapper(
		request.server.services.collection.document.getMultiple,
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
	zodSchema: collectionDocumentsSchema.getMultiple,
	swaggerSchema: {
		description: "Get a multiple collection document entries.",
		tags: ["collection-documents"],
		summary: "Get a multiple collection document entries.",
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "array",
					items: CollectionDocumentsFormatter.swagger,
				},
				paginated: true,
			}),
		},
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
