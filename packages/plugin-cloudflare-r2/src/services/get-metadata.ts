import { serverText } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceGetMeta } from "@lucidcms/core/types";
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
						message: serverText("plugin.cloudflare.r2.objects.not.found"),
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
					message: serverText("plugin.cloudflare.r2.errors.unknown", {
						fallback: error instanceof Error ? error.message : undefined,
					}),
				},
				data: undefined,
			};
		}
	};
};

export default getMetadata;
