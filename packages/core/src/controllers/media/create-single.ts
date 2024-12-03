import T from "../../translations/index.js";
import mediaSchema from "../../schemas/media.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const createSingleController: RouteController<
	typeof mediaSchema.createSingle.params,
	typeof mediaSchema.createSingle.body,
	typeof mediaSchema.createSingle.query
> = async (request, reply) => {
	const mediaIdRes = await serviceWrapper(
		request.server.services.media.createSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_create_error_name"),
				message: T("route_media_create_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			key: request.body.key,
			fileName: request.body.fileName,
			title: request.body.title,
			alt: request.body.alt,
			visible: 1,
		},
	);
	if (mediaIdRes.error) throw new LucidAPIError(mediaIdRes.error);

	reply.status(204).send();
};

export default {
	controller: createSingleController,
	zodSchema: mediaSchema.createSingle,
	swaggerSchema: {
		description: "Create a single media item.",
		tags: ["media"],
		summary: "Create a single media item.",
		response: {
			204: swaggerResponse({
				type: 204,
				noPropertise: true,
			}),
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};
