import type { MediaAdapterServiceGetMeta } from "@lucidcms/core/types";
import T from "../translations/index.js";
import type { PluginOptions } from "../types.js";

const getMetadata = (
	pluginOptions: PluginOptions,
): MediaAdapterServiceGetMeta => {
	return async (key) => {
		try {
			const object = await pluginOptions.binding.head(key);

			if (!object) {
				return {
					error: {
						type: "plugin",
						message: T("object_not_found"),
					},
					data: undefined,
				};
			}

			return {
				error: undefined,
				data: {
					size: object.size,
					mimeType: object.httpMetadata?.contentType || null,
					etag: object.etag || null,
				},
			};
		} catch (error) {
			return {
				error: {
					type: "plugin",
					message:
						error instanceof Error
							? error.message
							: T("an_unknown_error_occurred"),
				},
				data: undefined,
			};
		}
	};
};

export default getMetadata;
