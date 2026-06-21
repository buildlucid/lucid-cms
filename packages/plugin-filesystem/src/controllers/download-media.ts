import { Readable } from "node:stream";
import {
	buildDownloadContentDisposition,
	copy,
	createServiceContext,
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
	LucidAPIError,
	rateLimiterMiddleware as rateLimiter,
	serviceWrapper,
	validateMiddleware as validate,
} from "@lucidcms/core/plugin";
import { createFactory } from "hono/factory";
import { stream } from "hono/streaming";
import { describeRoute } from "hono-openapi";
import {
	FILE_SYSTEM_RATE_LIMIT,
	FILE_SYSTEM_RATE_LIMIT_WINDOW_MS,
} from "../constants.js";
import { controllerSchemas } from "../schema/fs.js";
import { downloadSingle } from "../services/index.js";

const factory = createFactory();

const downloadMediaController = factory.createHandlers(
	describeRoute({
		description: "Download a single media file from local storage.",
		tags: ["filesystem-plugin"],
		summary: "Download File",
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.download.query.string,
		}),
		responses: honoOpenAPIResponse(),
	}),
	rateLimiter({
		mode: "ip",
		scope: "filesystem-download",
		limit: FILE_SYSTEM_RATE_LIMIT,
		windowMs: FILE_SYSTEM_RATE_LIMIT_WINDOW_MS,
	}),
	validate("query", controllerSchemas.download.query.string),
	async (c) => {
		const context = createServiceContext(c);
		const query = c.req.valid("query");

		const downloadMedia = await serviceWrapper(downloadSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:plugin.filesystem.media.routes.download.error.name"),
				message: copy(
					"server:plugin.filesystem.media.routes.download.error.message",
				),
			},
		})(context, {
			key: query.key,
			token: query.token,
			timestamp: query.timestamp,
			fileName: query.fileName,
			extension: query.extension,
		});
		if (downloadMedia.error) throw new LucidAPIError(downloadMedia.error);

		const contentDisposition = buildDownloadContentDisposition({
			key: query.key,
			fileName: query.fileName,
			extension: query.extension,
		});
		c.header("X-Content-Type-Options", "nosniff");
		c.header("Content-Disposition", contentDisposition);
		if (downloadMedia.data.contentLength !== undefined) {
			c.header("Content-Length", String(downloadMedia.data.contentLength));
		}
		if (downloadMedia.data.contentType) {
			c.header("Content-Type", downloadMedia.data.contentType);
		}

		return stream(c, async (honoStream) => {
			if (downloadMedia.data.body instanceof Readable) {
				for await (const chunk of downloadMedia.data.body) {
					await honoStream.write(chunk);
				}
				return;
			}

			if (downloadMedia.data.body instanceof ReadableStream) {
				await honoStream.pipe(downloadMedia.data.body);
				return;
			}

			await honoStream.write(downloadMedia.data.body);
		});
	},
);

export default downloadMediaController;
