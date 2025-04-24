import z from "zod";
import T from "../../../../../translations/index.js";
import { controllerSchemas } from "../../../../../schemas/documents.js";
import { headers, response } from "../../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../../utils/build-response.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import type { RouteController } from "../../../../../types/types.js";

const getSingleController: RouteController<
	typeof controllerSchemas.client.getSingle.params,
	typeof controllerSchemas.client.getSingle.body,
	typeof controllerSchemas.client.getSingle.query.string,
	typeof controllerSchemas.client.getSingle.query.formatted
> = async (request, reply) => {
	const document = await serviceWrapper(
		request.server.services.collection.documents.client.getSingle,
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
	if (document.error) throw new LucidAPIError(document.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: document.data,
		}),
	);
};

export default {
	controller: getSingleController,
	zodSchema: controllerSchemas.client.getSingle,
	swaggerSchema: {
		description: "Get a single document by filters via the client integration.",
		tags: ["client-documents"],
		summary: "Get Document",

		headers: headers({
			authorization: true,
			clientKey: true,
		}),
		querystring: z.toJSONSchema(
			controllerSchemas.client.getSingle.query.string,
		),
		// body: z.toJSONSchema(controllerSchemas.client.getSingle.body),
		params: z.toJSONSchema(controllerSchemas.client.getSingle.params),
		response: response({
			schema: z.toJSONSchema(controllerSchemas.client.getSingle.response),
		}),
	},
};
