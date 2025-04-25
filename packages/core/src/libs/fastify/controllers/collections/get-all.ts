import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/collections.js";
import { swaggerResponse } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getAllController: RouteController<
	typeof controllerSchemas.getAll.params,
	typeof controllerSchemas.getAll.body,
	typeof controllerSchemas.getAll.query.string,
	typeof controllerSchemas.getAll.query.formatted
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
	zodSchema: controllerSchemas.getAll,
	swaggerSchema: {
		description: "Returns all the config for all collection instances.",
		tags: ["collections"],
		summary: "Get All Collections",

		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
		}),
	},
};
