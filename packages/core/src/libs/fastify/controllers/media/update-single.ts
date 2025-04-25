import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/media.js";
import {
	swaggerResponse,
	swaggerHeaders,
} from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const updateSingleController: RouteController<
	typeof controllerSchemas.updateSingle.params,
	typeof controllerSchemas.updateSingle.body,
	typeof controllerSchemas.updateSingle.query.string,
	typeof controllerSchemas.updateSingle.query.formatted
> = async (request, reply) => {
	const updateMedia = await serviceWrapper(
		request.server.services.media.updateSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_update_error_name"),
				message: T("route_media_update_error_message"),
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
			fileName: request.body.fileName,
			key: request.body.key,
			title: request.body.title,
			alt: request.body.alt,
		},
	);
	if (updateMedia.error) throw new LucidAPIError(updateMedia.error);

	reply.status(204).send();
};

export default {
	controller: updateSingleController,
	zodSchema: controllerSchemas.updateSingle,
	swaggerSchema: {
		description:
			"Update a single media entry with translations and new upload.",
		tags: ["media"],
		summary: "Update Media",

		headers: swaggerHeaders({
			csrf: true,
		}),
		body: z.toJSONSchema(controllerSchemas.updateSingle.body),
		params: z.toJSONSchema(controllerSchemas.updateSingle.params),
		response: swaggerResponse({
			noProperties: true,
		}),
	},
};
