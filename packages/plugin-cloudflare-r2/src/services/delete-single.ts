import { text } from "@lucidcms/core/plugin";
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
					message:
						error instanceof Error
							? text.literal(error.message)
							: text.server("plugin.cloudflare.r2.errors.unknown"),
				},
				data: undefined,
			};
		}
	};
};

export default deleteSingle;
