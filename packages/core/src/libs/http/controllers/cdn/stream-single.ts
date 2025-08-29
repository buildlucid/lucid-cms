import { createFactory } from "hono/factory";
import { stream } from "hono/streaming";
import validate from "../../middleware/validate.js";
import { controllerSchemas } from "../../../../schemas/cdn.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIParamaters } from "../../../../utils/open-api/index.js";
import { defaultErrorResponse } from "../../../../utils/open-api/hono-openapi-response.js";
import { Readable } from "node:stream";

const factory = createFactory();

/**
 * Steam a piece of media based on the given key.
 * @todo check this is working correctly since the Hono migration
 */
const streamSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Streams a piece of media based on the given key. If its an image, you can resize and format it on request. These will count towards the processed image usage that is unique to each image. This limit is configurable on a per project bases. Once it has been hit, instead of returning the processed image, it will return the original image. This is to prevent abuse of the endpoint.",
		tags: ["cdn"],
		summary: "Stream Media",
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.streamSingle.params,
			query: controllerSchemas.streamSingle.query.string,
		}),
		responses: {
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
						schema: defaultErrorResponse,
					},
				},
			},
			default: defaultErrorResponse,
		},
		validateResponse: true,
	}),
	validate("param", controllerSchemas.streamSingle.params),
	validate("query", controllerSchemas.streamSingle.query.string),
	async (c) => {
		const params = c.req.valid("param");
		const query = c.req.valid("query");

		// Parse Range header for video streaming support
		let range: { start: number; end?: number } | undefined;
		const rangeHeader = c.req.header("range");
		if (rangeHeader) {
			const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
			if (match?.[1]) {
				const start = Number.parseInt(match[1], 10);
				const end = match[2] ? Number.parseInt(match[2], 10) : undefined;
				range = { start, end };
			}
		}

		const response = await serviceWrapper(services.cdn.streamMedia, {
			transaction: false,
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
			},
			{
				key: params.key,
				query: query,
				accept: c.req.header("accept"),
				range,
			},
		);

		if (response.error) {
			const streamErrorImage = await serviceWrapper(
				services.cdn.streamErrorImage,
				{
					transaction: false,
				},
			)(
				{
					db: c.get("config").db.client,
					config: c.get("config"),
					services: services,
				},
				{
					fallback: query?.fallback ? Boolean(query?.fallback) : undefined,
					error: response.error,
				},
			);
			if (streamErrorImage.error)
				throw new LucidAPIError(streamErrorImage.error);

			c.header("Content-Type", streamErrorImage.data.contentType);
			return stream(c, async (stream) => {
				if (streamErrorImage.data.body instanceof ReadableStream) {
					await stream.pipe(streamErrorImage.data.body);
				} else if (streamErrorImage.data.body instanceof Uint8Array) {
					await stream.write(streamErrorImage.data.body);
				}
			});
		}

		c.header("Accept-Ranges", "bytes");

		// For partial content (range requests), set 206 status and Content-Range header
		if (
			response.data.isPartialContent &&
			response.data.range &&
			response.data.totalSize
		) {
			c.status(206);
			c.header(
				"Content-Range",
				`bytes ${response.data.range.start}-${response.data.range.end}/${response.data.totalSize}`,
			);
		} else {
			c.header("Cache-Control", "public, max-age=31536000, immutable");
		}

		c.header("Content-Disposition", `inline; filename="${response.data.key}"`);
		if (response.data.contentLength)
			c.header("Content-Length", response.data.contentLength.toString());
		if (response.data.contentType)
			c.header("Content-Type", response.data.contentType);

		return stream(c, async (stream) => {
			if (response.data.body instanceof ReadableStream) {
				await stream.pipe(response.data.body);
			} else if (response.data.body instanceof Uint8Array) {
				await stream.write(response.data.body);
			} else if (response.data.body instanceof Readable) {
				for await (const chunk of response.data.body) {
					await stream.write(chunk);
				}
			}
		});
	},
);

export default streamSingleController;
