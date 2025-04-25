import { z } from "@lucidcms/core";
import T from "../translations/index.js";
import { controllerSchemas } from "../schema/upload.js";
import uploadSingle from "../services/upload-single-endpoint.js";
import {
	serviceWrapper,
	LucidAPIError,
	swaggerResponse,
} from "@lucidcms/core/api";
import { DEFAULT_MIME_TYPES } from "../constants.js";
import type { PluginOptions } from "../types/types.js";
import type { RouteController } from "@lucidcms/core/types";

const uploadSingleController =
	(
		pluginOptions: PluginOptions,
	): RouteController<
		typeof controllerSchemas.upload.params,
		typeof controllerSchemas.upload.body,
		typeof controllerSchemas.upload.query.string,
		typeof controllerSchemas.upload.query.formatted
	> =>
	async (request, reply) => {
		const uploadMedia = await serviceWrapper(uploadSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_localstorage_upload_error_name"),
				message: T("route_localstorage_upload_error_message"),
			},
		})(
			{
				db: request.server.config.db.client,
				config: request.server.config,
				services: request.server.services,
			},
			{
				buffer: request.body as Buffer | undefined,
				key: request.query.key,
				token: request.query.token,
				timestamp: request.query.timestamp,
				pluginOptions: pluginOptions,
			},
		);
		if (uploadMedia.error) throw new LucidAPIError(uploadMedia.error);

		reply.status(200).send();
	};

export default {
	controller: uploadSingleController,
	zodSchema: controllerSchemas.upload,
	swaggerSchema: (pluginOptions: PluginOptions) => ({
		description: "Upload a single media file.",
		tags: ["localstorage-plugin"],
		summary: "Upload File",

		consumes:
			pluginOptions.supportedMimeTypes &&
			pluginOptions.supportedMimeTypes.length > 0
				? pluginOptions.supportedMimeTypes
				: DEFAULT_MIME_TYPES,
		querystring: z.toJSONSchema(controllerSchemas.upload.query.string),
		response: swaggerResponse({
			noProperties: true,
		}),
	}),
};
