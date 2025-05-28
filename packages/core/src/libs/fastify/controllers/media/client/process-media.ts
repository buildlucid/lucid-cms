import z from "zod";
import T from "../../../../../translations/index.js";
import { controllerSchemas } from "../../../../../schemas/media.js";
import { swaggerResponse } from "../../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../../utils/build-response.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import type { RouteController } from "../../../../../types/types.js";

const processMediaClientController: RouteController<
	typeof controllerSchemas.client.processMedia.params,
	typeof controllerSchemas.client.processMedia.body,
	typeof controllerSchemas.client.processMedia.query.string,
	typeof controllerSchemas.client.processMedia.query.formatted
> = async (request, reply) => {
	const media = await serviceWrapper(
		request.server.services.media.processMedia,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_fetch_error_name"),
				message: T("route_media_fetch_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			key: request.params["*"],
			body: request.body,
		},
	);
	if (media.error) throw new LucidAPIError(media.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: media.data,
		}),
	);
};

export default {
	controller: processMediaClientController,
	zodSchema: controllerSchemas.client.processMedia,
	swaggerSchema: {
		description:
			"Get a single media item by key and return the URL. This supports processing and fallback images.",
		tags: ["client-media"],
		summary: "Get Media URL",
		body: z.toJSONSchema(controllerSchemas.client.processMedia.body),
		params: z.toJSONSchema(controllerSchemas.client.processMedia.params),
		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.client.processMedia.response),
		}),
	},
};
