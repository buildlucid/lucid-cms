import T from "../../../../../translations/index.js";
import documentsSchema from "../../../../../schemas/documents.js";
import {
	swaggerResponse,
	swaggerQueryString,
	swaggerHeaders,
} from "../../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../../utils/build-response.js";
import DocumentsFormatter from "../../../../formatters/documents.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import type { RouteController } from "../../../../../types/types.js";

const getMultipleController: RouteController<
	typeof documentsSchema.client.getMultiple.params,
	typeof documentsSchema.client.getMultiple.body,
	typeof documentsSchema.client.getMultiple.query
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
	zodSchema: documentsSchema.client.getMultiple,
	swaggerSchema: {
		description:
			"Get multilple collection documents by filters via the client integration.",
		tags: ["client-integrations", "documents"],
		summary: "Get multiple collection document entries.",
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "array",
					items: DocumentsFormatter.swaggerClient,
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
					key: "id",
				},
				{
					key: "createdBy",
				},
				{
					key: "updatedBy",
				},
				{
					key: "createdAt",
				},
				{
					key: "updatedAt",
				},
			],
			sorts: ["createdAt", "updatedAt"],
			page: true,
			perPage: true,
		}),
	},
};
