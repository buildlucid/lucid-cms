import T from "../../translations/index.js";
import collectionsSchema from "../../schemas/collections.js";
import { swaggerResponse } from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import CollectionsFormatter from "../../libs/formatters/collections.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getAllController: RouteController<
	typeof collectionsSchema.getAll.params,
	typeof collectionsSchema.getAll.body,
	typeof collectionsSchema.getAll.query
> = async (request, reply) => {
	const collections = await serviceWrapper(
		request.server.services.collection.getAll,
		{
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_collection_fetch_error_name"),
				message: T("route_collection_fetch_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			includeDocumentId: true,
		},
	);
	if (collections.error) throw new LucidAPIError(collections.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: collections.data,
		}),
	);
};

export default {
	controller: getAllController,
	zodSchema: collectionsSchema.getAll,
	swaggerSchema: {
		description: "Get all collection instances.",
		tags: ["collections"],
		summary: "Get all collections",
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "array",
					items: CollectionsFormatter.swagger,
				},
			}),
		},
	},
};
