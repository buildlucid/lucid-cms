import T from "../../translations/index.js";
import collectionsSchema from "../../schemas/collections.js";
import { swaggerResponse } from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import CollectionsFormatter from "../../libs/formatters/collections.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getSingleController: RouteController<
	typeof collectionsSchema.getSingle.params,
	typeof collectionsSchema.getSingle.body,
	typeof collectionsSchema.getSingle.query
> = async (request, reply) => {
	const collection = await serviceWrapper(
		request.server.services.collection.getSingle,
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
			key: request.params.key,
			include: {
				bricks: true,
				fields: true,
				documentId: true,
			},
		},
	);
	if (collection.error) throw new LucidAPIError(collection.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: collection.data,
		}),
	);
};

export default {
	controller: getSingleController,
	zodSchema: collectionsSchema.getSingle,
	swaggerSchema: {
		description: "Get a single collection instance.",
		tags: ["collections"],
		summary: "Get a collection",
		response: {
			200: swaggerResponse({
				type: 200,
				data: CollectionsFormatter.swagger,
			}),
		},
	},
};
