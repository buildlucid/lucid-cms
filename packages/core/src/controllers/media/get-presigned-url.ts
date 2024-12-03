import T from "../../translations/index.js";
import mediaSchema from "../../schemas/media.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getPresignedUrlController: RouteController<
	typeof mediaSchema.getPresignedUrl.params,
	typeof mediaSchema.getPresignedUrl.body,
	typeof mediaSchema.getPresignedUrl.query
> = async (request, reply) => {
	const presignedUrl = await serviceWrapper(
		request.server.services.media.getPresignedUrl,
		{
			transaction: false,
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
			fileName: request.body.fileName,
			mimeType: request.body.mimeType,
		},
	);
	if (presignedUrl.error) throw new LucidAPIError(presignedUrl.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: presignedUrl.data,
		}),
	);
};

export default {
	controller: getPresignedUrlController,
	zodSchema: mediaSchema.getPresignedUrl,
};
