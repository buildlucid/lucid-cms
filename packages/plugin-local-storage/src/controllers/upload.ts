import T from "../translations/index.js";
import { controllerSchemas } from "../schema/upload.js";
import uploadSingle from "../services/upload-single-endpoint.js";
import {
	serviceWrapper,
	LucidAPIError,
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "@lucidcms/core/api";
import type { PluginOptions } from "../types/types.js";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { validateMiddleware } from "@lucidcms/core/api";

const factory = createFactory();

const uploadController = (pluginOptions: PluginOptions) =>
	factory.createHandlers(
		describeRoute({
			description: "Upload a single media file.",
			tags: ["localstorage-plugin"],
			summary: "Upload File",
			parameters: honoOpenAPIParamaters({
				query: controllerSchemas.upload.query.string,
			}),
			responses: honoOpenAPIResponse({
				noProperties: true,
			}),
			validateResponse: true,
		}),
		validateMiddleware("query", controllerSchemas.upload.query.string),
		async (c) => {
			const query = c.req.valid("query");
			const buffer = await c.req.arrayBuffer();

			const uploadMedia = await serviceWrapper(uploadSingle, {
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_localstorage_upload_error_name"),
					message: T("route_localstorage_upload_error_message"),
				},
			})(
				{
					db: c.get("config").db.client,
					config: c.get("config"),
					queue: c.get("queue"),
					env: c.get("env"),
					kv: c.get("kv"),
				},
				{
					buffer: buffer ? Buffer.from(buffer) : undefined,
					key: query.key,
					token: query.token,
					timestamp: query.timestamp,
					pluginOptions: pluginOptions,
				},
			);
			if (uploadMedia.error) throw new LucidAPIError(uploadMedia.error);

			c.status(200);
			return c.body(null);
		},
	);

export default uploadController;
