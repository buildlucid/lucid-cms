import { Readable } from "node:stream";
import { createFactory } from "hono/factory";
import { stream } from "hono/streaming";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/cdn.js";
import { cdnServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { defaultErrorResponse } from "../../../../utils/open-api/hono-openapi-response.js";
import { honoOpenAPIParamaters } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authorizePrivateMedia from "../../middleware/authorize-private-media.js";
import validate from "../../middleware/validate.js";
import {
	applyRangeHeaders,
	applyStreamingHeaders,
	parseRangeHeader,
} from "../../utils/streaming.js";

const factory = createFactory();

/**
 * Steam a piece of media based on the given key.
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
	authorizePrivateMedia,
	validate("query", controllerSchemas.streamSingle.query.string),
	async (c) => {
		const params = c.req.valid("param");
		const query = c.req.valid("query");

		const range = parseRangeHeader(c.req.header("range"));

		const response = await serviceWrapper(cdnServices.streamMedia, {
			transaction: false,
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
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
				cdnServices.streamErrorImage,
				{
					transaction: false,
				},
			)(
				{
					db: c.get("config").db.client,
					config: c.get("config"),
					queue: c.get("queue"),
					env: c.get("env"),
					kv: c.get("kv"),
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

		applyRangeHeaders(c, {
			isPartial: response.data.isPartialContent,
			range: response.data.range,
			totalSize: response.data.totalSize,
		});
		applyStreamingHeaders(c, {
			key: response.data.key,
			contentLength: response.data.contentLength,
			contentType: response.data.contentType,
		});

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
