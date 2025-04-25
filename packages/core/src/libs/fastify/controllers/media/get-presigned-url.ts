import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/media.js";
import {
	swaggerHeaders,
	swaggerResponse,
} from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getPresignedUrlController: RouteController<
	typeof controllerSchemas.getPresignedUrl.params,
	typeof controllerSchemas.getPresignedUrl.body,
	typeof controllerSchemas.getPresignedUrl.query.string,
	typeof controllerSchemas.getPresignedUrl.query.formatted
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
	zodSchema: controllerSchemas.getPresignedUrl,
	swaggerSchema: {
		description: "Get a presigned URL to upload a single media item.",
		tags: ["media"],
		summary: "Get Presigned URL",

		headers: swaggerHeaders({
			csrf: true,
		}),
		body: z.toJSONSchema(controllerSchemas.getPresignedUrl.body),
		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getPresignedUrl.response),
		}),
	},
};
