import z from "zod";
import T from "../../../../translations/index.js";
import collectionsSchema from "../../../../schemas/collections.js";
import { response } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getAllController: RouteController<
	typeof collectionsSchema.getAll.params,
	typeof collectionsSchema.getAll.body,
	typeof collectionsSchema.getAll.query.string,
	typeof collectionsSchema.getAll.query.formatted
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
		description: "Returns all the config for all collection instances.",
		tags: ["collections"],
		summary: "Get All Collections",

		// headers: headers({
		// csrf: true,
		// }),
		// querystring: z.toJSONSchema(collectionsSchema.getAll.query.string),
		// body: z.toJSONSchema(collectionsSchema.getAll.body),
		// params: z.toJSONSchema(collectionsSchema.getAll.params),
		response: response({
			schema: z.toJSONSchema(collectionsSchema.getAll.response),
		}),
	},
};
