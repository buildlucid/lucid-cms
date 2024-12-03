import T from "../../translations/index.js";
import collectionDocumentsSchema from "../../schemas/collection-documents.js";
import {
	swaggerResponse,
	swaggerQueryString,
} from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import CollectionDocumentsVersionsFormatter from "../../libs/formatters/collection-document-versions.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getMultipleRevisionsController: RouteController<
	typeof collectionDocumentsSchema.getMultipleRevisions.params,
	typeof collectionDocumentsSchema.getMultipleRevisions.body,
	typeof collectionDocumentsSchema.getMultipleRevisions.query
> = async (request, reply) => {
	const documentRevisions = await serviceWrapper(
		request.server.services.collection.document.getMultipleRevisions,
		{
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_document_revision_fetch_error_name"),
				message: T("route_document_revision_fetch_error_message"),
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
			documentId: Number.parseInt(request.params.id),
			query: request.query,
		},
	);
	if (documentRevisions.error) throw new LucidAPIError(documentRevisions.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: documentRevisions.data.data,
			pagination: {
				count: documentRevisions.data.count,
				page: request.query.page,
				perPage: request.query.perPage,
			},
		}),
	);
};

export default {
	controller: getMultipleRevisionsController,
	zodSchema: collectionDocumentsSchema.getMultipleRevisions,
	swaggerSchema: {
		description: "Get multiple revisions entries for a collection document.",
		tags: ["collection-documents"],
		summary: "Get multiple revisions for a collection document.",
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "array",
					items: CollectionDocumentsVersionsFormatter.swagger,
				},
				paginated: true,
			}),
		},
		querystring: swaggerQueryString({
			filters: [
				{
					key: "createdBy",
				},
			],
			sorts: ["createdAt"],
			page: true,
			perPage: true,
		}),
	},
};
