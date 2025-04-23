import z from "zod";
import T from "../../../../translations/index.js";
import documentsSchema from "../../../../schemas/documents.js";
import { response } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getMultipleController: RouteController<
	typeof documentsSchema.getMultiple.params,
	typeof documentsSchema.getMultiple.body,
	typeof documentsSchema.getMultiple.query.string,
	typeof documentsSchema.getMultiple.query.formatted
> = async (request, reply) => {
	const documents = await serviceWrapper(
		request.server.services.collection.documents.getMultiple,
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
	zodSchema: documentsSchema.getMultiple,
	swaggerSchema: {
		description:
			"Get a multiple document entries for a given collection and status (version type).",
		tags: ["documents"],
		summary: "Get Multiple Documents",

		// headers: headers({
		// csrf: true,
		// }),
		querystring: z.toJSONSchema(documentsSchema.getMultiple.query.string),
		// body: z.toJSONSchema(documentsSchema.getMultiple.body),
		params: z.toJSONSchema(documentsSchema.getMultiple.params),
		response: response({
			schema: z.toJSONSchema(documentsSchema.getMultiple.response),
			paginated: true,
		}),
	},
};
