import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/media.js";
import {
	swaggerHeaders,
	swaggerResponse,
} from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const deleteSingleController: RouteController<
	typeof controllerSchemas.deleteSingle.params,
	typeof controllerSchemas.deleteSingle.body,
	typeof controllerSchemas.deleteSingle.query.string,
	typeof controllerSchemas.deleteSingle.query.formatted
> = async (request, reply) => {
	const deleteSingel = await serviceWrapper(
		request.server.services.media.deleteSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_delete_error_name"),
				message: T("route_media_delete_error_message"),
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
	if (deleteSingel.error) throw new LucidAPIError(deleteSingel.error);

	reply.status(204).send();
};

export default {
	controller: deleteSingleController,
	zodSchema: controllerSchemas.deleteSingle,
	swaggerSchema: {
		description:
			"Delete a single media item by id and clear its processed images if media is an image.",
		tags: ["media"],
		summary: "Delete Media",

		headers: swaggerHeaders({
			csrf: true,
		}),
		params: z.toJSONSchema(controllerSchemas.deleteSingle.params),
		response: swaggerResponse({
			noProperties: true,
		}),
	},
};
