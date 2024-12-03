import T from "../../translations/index.js";
import mediaSchema from "../../schemas/media.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const deleteSingleController: RouteController<
	typeof mediaSchema.deleteSingle.params,
	typeof mediaSchema.deleteSingle.body,
	typeof mediaSchema.deleteSingle.query
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
	zodSchema: mediaSchema.deleteSingle,
};
