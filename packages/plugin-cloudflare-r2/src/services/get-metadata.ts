import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceGetMeta } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";
import { resolveBinding } from "../utils/resolve-binding.js";

const getMetadata = (
	pluginOptions: PluginOptions,
): MediaAdapterServiceGetMeta => {
	return async (context, { key }) => {
		try {
			const binding = resolveBinding(context, pluginOptions);
			const object = await binding.head(key);

			if (!object) {
				return {
					error: {
						type: "plugin",
						message: copy("server:plugin.cloudflare.r2.objects.not.found"),
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
							? copy.literal(error.message)
							: copy("server:plugin.cloudflare.r2.errors.unknown"),
				},
				data: undefined,
			};
		}
	};
};

export default getMetadata;
