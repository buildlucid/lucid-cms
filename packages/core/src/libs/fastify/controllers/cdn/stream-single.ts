import z from "zod";
import { controllerSchemas } from "../../../../schemas/cdn.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { swaggerRefs } from "../../../../api.js";
import type { RouteController } from "../../../../types/types.js";

const streamSingleController: RouteController<
	typeof controllerSchemas.streamSingle.params,
	typeof controllerSchemas.streamSingle.body,
	typeof controllerSchemas.streamSingle.query.string,
	typeof controllerSchemas.streamSingle.query.formatted
> = async (request, reply) => {
	//*  parse Range header for video streaming support
	let range: { start: number; end?: number } | undefined;
	const rangeHeader = request.headers.range;
	if (rangeHeader) {
		const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
		if (match?.[1]) {
			const start = Number.parseInt(match[1], 10);
			const end = match[2] ? Number.parseInt(match[2], 10) : undefined;
			range = { start, end };
		}
	}

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
			query: request.formattedQuery,
			accept: request.headers.accept,
			range,
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
				fallback: request.formattedQuery?.fallback
					? Boolean(request.formattedQuery?.fallback)
					: undefined,
				error: response.error,
			},
		);
		if (streamErrorImage.error) throw new LucidAPIError(streamErrorImage.error);

		reply.header("Content-Type", streamErrorImage.data.contentType);
		return reply.send(streamErrorImage.data.body);
	}

	reply.header("Accept-Ranges", "bytes");

	//* for partial content (range requests), set 206 status and Content-Range header
	if (
		response.data.isPartialContent &&
		response.data.range &&
		response.data.totalSize
	) {
		reply.code(206);
		reply.header(
			"Content-Range",
			`bytes ${response.data.range.start}-${response.data.range.end}/${response.data.totalSize}`,
		);
	} else {
		reply.header("Cache-Control", "public, max-age=31536000, immutable");
	}

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
	zodSchema: controllerSchemas.streamSingle,
	swaggerSchema: {
		description:
			"Streams a piece of media based on the given key. If its an image, you can resize and format it on request. These will count towards the processed image usage that is unique to each image. This limit is configurable on a per project bases. Once it has been hit, instead of returning the processed image, it will return the original image. This is to prevent abuse of the endpoint.",
		tags: ["cdn"],
		summary: "Stream Media",

		querystring: z.toJSONSchema(controllerSchemas.streamSingle.query.string),
		params: z.toJSONSchema(controllerSchemas.streamSingle.params),
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
					"Accept-Ranges": {
						schema: {
							type: "string",
						},
					},
				},
			},
			206: {
				description: "Partial content - range request response",
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
					"Content-Range": {
						schema: {
							type: "string",
						},
					},
					"Accept-Ranges": {
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
			416: {
				description: "Range Not Satisfiable",
				content: {
					"application/json": {
						schema: {
							$ref: swaggerRefs.defaultError,
						},
					},
				},
			},
			default: {
				$ref: swaggerRefs.defaultError,
			},
		},
	},
};
