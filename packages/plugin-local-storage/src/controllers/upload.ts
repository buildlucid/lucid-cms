import T from "../translations/index.js";
import uploadSchema from "../schema/upload.js";
import uploadSingle from "../services/upload-single-endpoint.js";
import { serviceWrapper, LucidAPIError } from "@lucidcms/core/api";
import type { PluginOptions } from "../types/types.js";
import type { RouteController } from "@lucidcms/core/types";

const uploadSingleController =
	(
		pluginOptions: PluginOptions,
	): RouteController<
		typeof uploadSchema.params,
		typeof uploadSchema.body,
		typeof uploadSchema.query
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
	zodSchema: uploadSchema,
	swaggerSchema: {
		description: "Upload a single media file.",
		tags: ["localstorage-plugin"],
		summary: "Upload a single media file.",
		response: {
			200: {
				type: "null",
			},
		},
	},
};
