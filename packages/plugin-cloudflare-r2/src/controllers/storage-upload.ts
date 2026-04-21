import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
	LucidAPIError,
	rateLimiterMiddleware as rateLimiter,
	serviceWrapper,
	validateMiddleware as validate,
} from "@lucidcms/core/plugin";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import {
	STORAGE_RATE_LIMIT,
	STORAGE_RATE_LIMIT_WINDOW_MS,
} from "../constants.js";
import { controllerSchemas } from "../schema/storage.js";
import storageUpload from "../services/storage-upload.js";
import T from "../translations/index.js";
import type { PluginOptions } from "../types.js";
import getServiceContext from "../utils/get-service-context.js";

const factory = createFactory();

const storageUploadController = (pluginOptions: PluginOptions) =>
	factory.createHandlers(
		describeRoute({
			description:
				"Upload a single media file through the Cloudflare R2 binding.",
			tags: ["cloudflare-r2-plugin"],
			summary: "Upload Storage File",
			parameters: honoOpenAPIParamaters({
				query: controllerSchemas.storageUpload.query.string,
			}),
			responses: honoOpenAPIResponse({
				noProperties: true,
			}),
		}),
		rateLimiter({
			mode: "ip",
			scope: "cloudflare-r2-storage-upload",
			limit: STORAGE_RATE_LIMIT,
			windowMs: STORAGE_RATE_LIMIT_WINDOW_MS,
		}),
		validate("query", controllerSchemas.storageUpload.query.string),
		async (c) => {
			const query = c.req.valid("query");
			const context = getServiceContext(c);

			const uploadMedia = await serviceWrapper(storageUpload(pluginOptions), {
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_storage_upload_error_name"),
					message: T("route_storage_upload_error_message"),
				},
			})(context, {
				key: query.key,
				token: query.token,
				timestamp: query.timestamp,
				extension: query.extension,
				contentType: c.req.header("content-type") ?? undefined,
				contentLength: c.req.header("content-length")
					? Number.parseInt(c.req.header("content-length") as string, 10)
					: undefined,
				body: c.req.raw.body,
			});
			if (uploadMedia.error) throw new LucidAPIError(uploadMedia.error);

			c.status(204);
			return c.body(null);
		},
	);

export default storageUploadController;
