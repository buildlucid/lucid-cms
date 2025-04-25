import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/media.js";
import { response, headers } from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const clearAllProcessedController: RouteController<
	typeof controllerSchemas.clearAllProcessed.params,
	typeof controllerSchemas.clearAllProcessed.body,
	typeof controllerSchemas.clearAllProcessed.query.string,
	typeof controllerSchemas.clearAllProcessed.query.formatted
> = async (request, reply) => {
	const clearProcessed = await serviceWrapper(
		request.server.services.processedImage.clearAll,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_clear_processed_error_name"),
				message: T("route_media_clear_processed_error_message"),
			},
		},
	)({
		db: request.server.config.db.client,
		config: request.server.config,
		services: request.server.services,
	});
	if (clearProcessed.error) throw new LucidAPIError(clearProcessed.error);

	reply.status(204).send();
};

export default {
	controller: clearAllProcessedController,
	zodSchema: controllerSchemas.clearAllProcessed,
	swaggerSchema: {
		description: "Clears all processed images for a every media item.",
		tags: ["media"],
		summary: "Clear Every Processed Image",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(controllerSchemas.clearAllProcessed.query.string),
		// body: z.toJSONSchema(controllerSchemas.clearAllProcessed.body),
		// params: z.toJSONSchema(controllerSchemas.clearAllProcessed.params),
		response: response({
			noProperties: true,
		}),
	},
};
