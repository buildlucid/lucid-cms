import { copy } from "@lucidcms/core/plugin";
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

export default deleteMultiple;
