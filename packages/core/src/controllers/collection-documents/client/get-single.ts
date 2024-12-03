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

const getSingleController: RouteController<
	typeof collectionDocumentsSchema.client.getSingle.params,
	typeof collectionDocumentsSchema.client.getSingle.body,
	typeof collectionDocumentsSchema.client.getSingle.query
> = async (request, reply) => {
	const document = await serviceWrapper(
		request.server.services.collection.document.client.getSingle,
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
	if (document.error) throw new LucidAPIError(document.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: document.data,
		}),
	);
};

export default {
	controller: getSingleController,
	zodSchema: collectionDocumentsSchema.client.getSingle,
	swaggerSchema: {
		description:
			"Get a single collection document by filters via the client integration.",
		tags: ["client-integrations", "collection-documents"],
		summary: "Get a single collection document entry.",
		response: {
			200: swaggerResponse({
				type: 200,
				data: CollectionDocumentsFormatter.swaggerClient,
			}),
		},
		headers: swaggerHeaders({
			authorization: true,
			clientKey: true,
		}),
		querystring: swaggerQueryString({
			include: ["bricks"],
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
		}),
	},
};
