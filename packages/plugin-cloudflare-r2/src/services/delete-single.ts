import { serverText } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceDeleteSingle } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";

const deleteSingle = (
	pluginOptions: PluginOptions,
): MediaAdapterServiceDeleteSingle => {
	return async (key) => {
		try {
			await pluginOptions.binding.delete(key);

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

export default deleteSingle;
