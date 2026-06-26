import { Readable } from "node:stream";
import {
	buildDownloadContentDisposition,
	copy,
	createRoute,
	LucidAPIError,
	rateLimiterMiddleware as rateLimiter,
	serviceWrapper,
} from "@lucidcms/core/plugin";
import { stream } from "hono/streaming";
import {
	FILE_SYSTEM_DOWNLOAD_ROUTE,
	FILE_SYSTEM_RATE_LIMIT,
	FILE_SYSTEM_RATE_LIMIT_WINDOW_MS,
	FILE_SYSTEM_UPLOAD_ROUTE,
} from "../constants.js";
import { controllerSchemas } from "../schema/fs.js";
import { downloadSingle, uploadSingle } from "../services/index.js";

const routes = () => [
	createRoute({
		method: "get",
		path: FILE_SYSTEM_DOWNLOAD_ROUTE,
		schema: controllerSchemas.download,
		middleware: [
			rateLimiter({
				mode: "ip",
				scope: "filesystem-download",
				limit: FILE_SYSTEM_RATE_LIMIT,
				windowMs: FILE_SYSTEM_RATE_LIMIT_WINDOW_MS,
			}),
		],
		openAPI: {
			description: "Download a single media file from local storage.",
			tags: ["filesystem-plugin"],
			summary: "Download File",
		},
		handler: async ({ hono, context, input }) => {
			const query = input.query;

			const downloadMedia = await serviceWrapper(downloadSingle, {
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy(
						"server:plugin.filesystem.media.routes.download.error.name",
					),
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
			hono.header("X-Content-Type-Options", "nosniff");
			hono.header("Content-Disposition", contentDisposition);
			if (downloadMedia.data.contentLength !== undefined) {
				hono.header("Content-Length", String(downloadMedia.data.contentLength));
			}
			if (downloadMedia.data.contentType) {
				hono.header("Content-Type", downloadMedia.data.contentType);
			}

			return stream(hono, async (honoStream) => {
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
	}),
	createRoute({
		method: "put",
		path: FILE_SYSTEM_UPLOAD_ROUTE,
		schema: controllerSchemas.upload,
		middleware: [
			rateLimiter({
				mode: "ip",
				scope: "filesystem-upload",
				limit: FILE_SYSTEM_RATE_LIMIT,
				windowMs: FILE_SYSTEM_RATE_LIMIT_WINDOW_MS,
			}),
		],
		openAPI: {
			description: "Upload a single media file.",
			tags: ["filesystem-plugin"],
			summary: "Upload File",
		},
		handler: async ({ hono, context, input }) => {
			const query = input.query;
			const buffer = await hono.req.arrayBuffer();

			const uploadMedia = await serviceWrapper(uploadSingle, {
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:plugin.filesystem.media.routes.upload.error.name"),
					message: copy(
						"server:plugin.filesystem.media.routes.upload.error.message",
					),
				},
			})(context, {
				buffer: buffer ? Buffer.from(buffer) : undefined,
				key: query.key,
				mimeType: query.mimeType,
				extension: query.extension,
				token: query.token,
				timestamp: query.timestamp,
			});
			if (uploadMedia.error) throw new LucidAPIError(uploadMedia.error);

			hono.status(204);
			return hono.body(null);
		},
	}),
];

export default routes;
