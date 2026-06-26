import { Readable } from "node:stream";
import {
	copy,
	createRoute,
	LucidAPIError,
	rateLimiterMiddleware as rateLimiter,
	serviceWrapper,
} from "@lucidcms/core/plugin";
import { stream } from "hono/streaming";
import {
	STORAGE_DOWNLOAD_ROUTE,
	STORAGE_RATE_LIMIT,
	STORAGE_RATE_LIMIT_WINDOW_MS,
	STORAGE_UPLOAD_ROUTE,
} from "../constants.js";
import { controllerSchemas } from "../schema/storage.js";
import storageDownload from "../services/storage-download.js";
import storageUpload from "../services/storage-upload.js";
import type { PluginOptions } from "../types.js";
import buildDownloadContentDisposition from "../utils/build-download-content-disposition.js";

/**
 * Registers the plugin's binding-specific transport routes. Keeping these
 * routes inside the plugin avoids teaching core about an R2-only concern.
 */
const routes = (pluginOptions: PluginOptions) => [
	createRoute({
		method: "get",
		path: STORAGE_DOWNLOAD_ROUTE,
		schema: controllerSchemas.storageDownload,
		middleware: [
			rateLimiter({
				mode: "ip",
				scope: "cloudflare-r2-storage-download",
				limit: STORAGE_RATE_LIMIT,
				windowMs: STORAGE_RATE_LIMIT_WINDOW_MS,
			}),
		],
		openAPI: {
			description:
				"Download a single media file from the Cloudflare R2 binding using a signed URL.",
			tags: ["cloudflare-r2-plugin"],
			summary: "Download Storage File",
		},
		handler: async ({ hono, context, input }) => {
			const query = input.query;

			const downloadMedia = await serviceWrapper(
				storageDownload(pluginOptions),
				{
					transaction: false,
					defaultError: {
						type: "basic",
						name: copy(
							"server:plugin.cloudflare.r2.routes.storage.download.error.name",
						),
						message: copy(
							"server:plugin.cloudflare.r2.routes.storage.download.error.message",
						),
					},
				},
			)(context, {
				key: query.key,
				token: query.token,
				timestamp: query.timestamp,
				fileName: query.fileName,
				extension: query.extension,
			});
			if (downloadMedia.error) throw new LucidAPIError(downloadMedia.error);
			if (!downloadMedia.data) {
				throw new LucidAPIError({
					type: "basic",
					status: 500,
					message: copy(
						"server:plugin.cloudflare.r2.routes.storage.download.error.message",
					),
				});
			}

			const downloadData = downloadMedia.data;

			hono.header(
				"Content-Disposition",
				buildDownloadContentDisposition({
					key: query.key,
					fileName: query.fileName,
					extension: query.extension,
				}),
			);
			if (downloadData.contentLength !== undefined) {
				hono.header("Content-Length", String(downloadData.contentLength));
			}
			if (downloadData.contentType) {
				hono.header("Content-Type", downloadData.contentType);
			}

			return stream(hono, async (honoStream) => {
				if (downloadData.body instanceof ReadableStream) {
					await honoStream.pipe(downloadData.body);
				} else if (downloadData.body instanceof Uint8Array) {
					await honoStream.write(downloadData.body);
				} else if (downloadData.body instanceof Readable) {
					for await (const chunk of downloadData.body) {
						await honoStream.write(chunk);
					}
				}
			});
		},
	}),
	createRoute({
		method: "put",
		path: STORAGE_UPLOAD_ROUTE,
		schema: controllerSchemas.storageUpload,
		middleware: [
			rateLimiter({
				mode: "ip",
				scope: "cloudflare-r2-storage-upload",
				limit: STORAGE_RATE_LIMIT,
				windowMs: STORAGE_RATE_LIMIT_WINDOW_MS,
			}),
		],
		openAPI: {
			description:
				"Upload a single media file through the Cloudflare R2 binding.",
			tags: ["cloudflare-r2-plugin"],
			summary: "Upload Storage File",
		},
		handler: async ({ hono, context, input }) => {
			const query = input.query;

			const uploadMedia = await serviceWrapper(storageUpload(pluginOptions), {
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy(
						"server:plugin.cloudflare.r2.routes.storage.upload.error.name",
					),
					message: copy(
						"server:plugin.cloudflare.r2.routes.storage.upload.error.message",
					),
				},
			})(context, {
				key: query.key,
				token: query.token,
				timestamp: query.timestamp,
				extension: query.extension,
				contentType: hono.req.header("content-type") ?? undefined,
				contentLength: hono.req.header("content-length")
					? Number.parseInt(hono.req.header("content-length") as string, 10)
					: undefined,
				body: hono.req.raw.body,
			});
			if (uploadMedia.error) throw new LucidAPIError(uploadMedia.error);

			hono.status(204);
			return hono.body(null);
		},
	}),
];

export default routes;
