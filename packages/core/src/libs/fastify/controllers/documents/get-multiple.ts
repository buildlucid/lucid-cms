import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { swaggerResponse } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getMultipleController: RouteController<
	typeof controllerSchemas.getMultiple.params,
	typeof controllerSchemas.getMultiple.body,
	typeof controllerSchemas.getMultiple.query.string,
	typeof controllerSchemas.getMultiple.query.formatted
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
	zodSchema: controllerSchemas.getMultiple,
	swaggerSchema: {
		description:
			"Get a multiple document entries for a given collection and status (version type).",
		tags: ["documents"],
		summary: "Get Multiple Documents",

		querystring: z.toJSONSchema(controllerSchemas.getMultiple.query.string),
		params: z.toJSONSchema(controllerSchemas.getMultiple.params),
		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
	},
};
