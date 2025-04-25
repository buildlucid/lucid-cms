import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/media.js";
import { headers, response } from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const clearSingleProcessedController: RouteController<
	typeof controllerSchemas.clearSingleProcessed.params,
	typeof controllerSchemas.clearSingleProcessed.body,
	typeof controllerSchemas.clearSingleProcessed.query.string,
	typeof controllerSchemas.clearSingleProcessed.query.formatted
> = async (request, reply) => {
	const clearProcessed = await serviceWrapper(
		request.server.services.processedImage.clearSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_clear_processed_error_name"),
				message: T("route_media_clear_processed_error_message"),
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
		},
	);
	if (clearProcessed.error) throw new LucidAPIError(clearProcessed.error);

	reply.status(204).send();
};

export default {
	controller: clearSingleProcessedController,
	zodSchema: controllerSchemas.clearSingleProcessed,
	swaggerSchema: {
		description:
			"Clear all processed images for a single media item based on the given key.",
		tags: ["media"],
		summary: "Clear Processed Images",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(controllerSchemas.clearSingleProcessed.query.string),
		// body: z.toJSONSchema(controllerSchemas.clearSingleProcessed.body),
		// params: z.toJSONSchema(controllerSchemas.clearSingleProcessed.params),
		response: response({
			noProperties: true,
		}),
	},
};
