import { Readable } from "node:stream";
import {
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
	STORAGE_RATE_LIMIT,
	STORAGE_RATE_LIMIT_WINDOW_MS,
} from "../constants.js";
import { controllerSchemas } from "../schema/storage.js";
import storageDownload from "../services/storage-download.js";
import T from "../translations/index.js";
import type { PluginOptions } from "../types.js";
import buildDownloadContentDisposition from "../utils/build-download-content-disposition.js";

const factory = createFactory();

const storageDownloadController = (pluginOptions: PluginOptions) =>
	factory.createHandlers(
		describeRoute({
			description:
				"Download a single media file from the Cloudflare R2 binding using a signed URL.",
			tags: ["cloudflare-r2-plugin"],
			summary: "Download Storage File",
			parameters: honoOpenAPIParamaters({
				query: controllerSchemas.storageDownload.query.string,
			}),
			responses: honoOpenAPIResponse(),
		}),
		rateLimiter({
			mode: "ip",
			scope: "cloudflare-r2-storage-download",
			limit: STORAGE_RATE_LIMIT,
			windowMs: STORAGE_RATE_LIMIT_WINDOW_MS,
		}),
		validate("query", controllerSchemas.storageDownload.query.string),
		async (c) => {
			const query = c.req.valid("query");
			const context = createServiceContext(c);

			const downloadMedia = await serviceWrapper(
				storageDownload(pluginOptions),
				{
					transaction: false,
					defaultError: {
						type: "basic",
						name: T("route_storage_download_error_name"),
						message: T("route_storage_download_error_message"),
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
					message: T("route_storage_download_error_message"),
				});
			}

			const downloadData = downloadMedia.data;

			c.header(
				"Content-Disposition",
				buildDownloadContentDisposition({
					key: query.key,
					fileName: query.fileName,
					extension: query.extension,
				}),
			);
			if (downloadData.contentLength !== undefined) {
				c.header("Content-Length", String(downloadData.contentLength));
			}
			if (downloadData.contentType) {
				c.header("Content-Type", downloadData.contentType);
			}

			return stream(c, async (honoStream) => {
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
	);

export default storageDownloadController;
