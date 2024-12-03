import cdnSchema from "../../schemas/cdn.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const streamSingleController: RouteController<
	typeof cdnSchema.streamSingle.params,
	typeof cdnSchema.streamSingle.body,
	typeof cdnSchema.streamSingle.query
> = async (request, reply) => {
	const response = await serviceWrapper(
		request.server.services.cdn.streamMedia,
		{
			transaction: false,
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			key: request.params["*"],
			query: request.query,
			accept: request.headers.accept,
		},
	);
	if (response.error) {
		const streamErrorImage = await serviceWrapper(
			request.server.services.cdn.streamErrorImage,
			{
				transaction: false,
			},
		)(
			{
				db: request.server.config.db.client,
				config: request.server.config,
				services: request.server.services,
			},
			{
				fallback: request.query?.fallback,
				error: response.error,
			},
		);
		if (streamErrorImage.error) throw new LucidAPIError(streamErrorImage.error);

		reply.header("Content-Type", streamErrorImage.data.contentType);
		return reply.send(streamErrorImage.data.body);
	}

	reply.header("Cache-Control", "public, max-age=31536000, immutable");
	reply.header(
		"Content-Disposition",
		`inline; filename="${response.data.key}"`,
	);
	if (response.data.contentLength)
		reply.header("Content-Length", response.data.contentLength);
	if (response.data.contentType)
		reply.header("Content-Type", response.data.contentType);

	return reply.send(response.data.body);
};

export default {
	controller: streamSingleController,
	zodSchema: cdnSchema.streamSingle,
	swaggerSchema: {
		description:
			"Stream a piece of media. If its an image, you can resize and format it on request. These will count towards the parent images processed image usage. This limit is configurable on a per project bases. Once it has been hit, instead of returning the processed image, it will return the original image. This is to prevent abuse of the endpoint.",
		tags: ["cdn"],
		summary: "Steam media",
		querystring: {
			type: "object",
			properties: {
				width: {
					type: "string",
				},
				height: {
					type: "string",
				},
				format: {
					type: "string",
					enum: ["jpeg", "png", "webp", "avif"],
				},
				quality: {
					type: "string",
				},
				fallback: {
					type: "string",
					enum: ["1", "0"],
				},
			},
		},
	},
};
