import T from "../../../../translations/index.js";
import documentsSchema from "../../../../schemas/documents.js";
import {
	swaggerResponse,
	swaggerQueryString,
	response,
} from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import DocumentsFormatter from "../../../formatters/documents.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";
import type { DocumentVersionType } from "../../..//db/types.js";
import z from "zod";

const getSingleController: RouteController<
	typeof documentsSchema.getSingle.params,
	typeof documentsSchema.getSingle.body,
	typeof documentsSchema.getSingle.query.string,
	typeof documentsSchema.getSingle.query.formatted
> = async (request, reply) => {
	const hasStatus =
		request.params.statusOrId === "draft" ||
		request.params.statusOrId === "published";

	const document = await serviceWrapper(
		request.server.services.collection.documents.getSingle,
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
			id: Number.parseInt(request.params.id),
			status: hasStatus
				? (request.params.statusOrId as DocumentVersionType)
				: undefined,
			versionId: !hasStatus
				? Number.parseInt(request.params.statusOrId)
				: undefined,
			collectionKey: request.params.collectionKey,
			query: request.formattedQuery,
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
	zodSchema: documentsSchema.getSingle,
	swaggerSchema: {
		description: "Get a single document from the collection key and ID.",
		tags: ["documents"],
		summary: "Get Document",

		// headers: headers({
		// csrf: true,
		// }),
		querystring: z.toJSONSchema(documentsSchema.getSingle.query.string),
		// body: z.toJSONSchema(documentsSchema.getSingle.body),
		params: z.toJSONSchema(documentsSchema.getSingle.params),
		response: response({
			schema: z.toJSONSchema(documentsSchema.getSingle.response),
		}),
	},
};
