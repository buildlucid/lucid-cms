import z from "zod";
import T from "../../../../translations/index.js";
import collectionsSchema from "../../../../schemas/collections.js";
import { response } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getSingleController: RouteController<
	typeof collectionsSchema.getSingle.params,
	typeof collectionsSchema.getSingle.body,
	typeof collectionsSchema.getSingle.query.string,
	typeof collectionsSchema.getSingle.query.formatted
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
		summary: "Get Collection",

		// headers: headers({
		// csrf: true,
		// }),
		// querystring: z.toJSONSchema(collectionsSchema.getSingle.query.string),
		// body: z.toJSONSchema(collectionsSchema.getSingle.body),
		params: z.toJSONSchema(collectionsSchema.getSingle.params),
		response: response({
			schema: z.toJSONSchema(collectionsSchema.getSingle.response),
		}),
	},
};
