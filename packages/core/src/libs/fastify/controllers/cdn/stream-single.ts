import cdnSchema from "../../../../schemas/cdn.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";
import { defaultErrorResponse } from "../../../../utils/swagger/response.js";
import z from "zod";

const streamSingleController: RouteController<
	typeof cdnSchema.streamSingle.params,
	typeof cdnSchema.streamSingle.body,
	typeof cdnSchema.streamSingle.query.string,
	typeof cdnSchema.streamSingle.query.formatted
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
				fallback: request.query?.fallback
					? Boolean(request.query?.fallback)
					: undefined,
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
			"Streams a piece of media based on the given key. If its an image, you can resize and format it on request. These will count towards the processed image usage that is unique to each image. This limit is configurable on a per project bases. Once it has been hit, instead of returning the processed image, it will return the original image. This is to prevent abuse of the endpoint.",
		tags: ["cdn"],
		summary: "Stream Media",

		// headers: headers({
		// 	csrf: true,
		// }),
		querystring: z.toJSONSchema(cdnSchema.streamSingle.query.string),
		// body: z.toJSONSchema(cdnSchema.streamSingle.body),
		params: z.toJSONSchema(cdnSchema.streamSingle.params),
		response: {
			200: {
				description: "Successfully streamed media content",
				content: {
					"*/*": {
						schema: {
							type: "string",
							format: "binary",
						},
					},
				},
				headers: {
					"Content-Type": {
						schema: {
							type: "string",
						},
					},
					"Content-Length": {
						schema: {
							type: "integer",
						},
					},
					"Content-Disposition": {
						schema: {
							type: "string",
						},
					},
					"Cache-Control": {
						schema: {
							type: "string",
						},
					},
				},
			},
			404: {
				description: "Media not found - returns an error image",
				content: {
					"image/*": {
						schema: {
							type: "string",
							format: "binary",
						},
					},
				},
			},
			default: defaultErrorResponse,
		},
	},
};
