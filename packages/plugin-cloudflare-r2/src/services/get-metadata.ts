import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceGetMeta } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";
import { resolveBinding } from "../utils/resolve-binding.js";

const getMetadata = (
	pluginOptions: PluginOptions,
): MediaStorageAdapterServiceGetMeta => {
	return async (context, { key }) => {
		try {
			const binding = resolveBinding(context, pluginOptions);
			const object = await binding.head(key);

			if (!object) {
				throw new LucidError({
					type: "plugin",
					status: 404,
					message: copy("server:plugin.cloudflare.r2.objects.not.found"),
				});
			}

			return {
				size: object.size,
				mimeType: object.httpMetadata?.contentType || null,
				etag: object.etag || null,
				status: "ready",
			};
		} catch (error) {
			if (error instanceof LucidError) throw error;
			throw new LucidError({
				type: "plugin",
				message:
					error instanceof Error
						? copy.literal(error.message)
						: copy("server:plugin.cloudflare.r2.errors.unknown"),
			});
		}
	};
};

export default getMetadata;
