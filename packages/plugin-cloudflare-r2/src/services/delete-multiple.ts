import { serverText } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceDeleteMultiple } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";

const deleteMultiple = (
	pluginOptions: PluginOptions,
): MediaAdapterServiceDeleteMultiple => {
	return async (keys) => {
		try {
			if (keys.length === 0) {
				return {
					error: undefined,
					data: undefined,
				};
			}

			await pluginOptions.binding.delete(keys);

			return {
				error: undefined,
				data: undefined,
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

export default deleteMultiple;
