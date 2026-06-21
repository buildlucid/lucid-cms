import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceDeleteMultiple } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";
import { resolveBinding } from "../utils/resolve-binding.js";

const deleteMultiple = (
	pluginOptions: PluginOptions,
): MediaAdapterServiceDeleteMultiple => {
	return async (context, { keys }) => {
		try {
			if (keys.length === 0) {
				return {
					error: undefined,
					data: undefined,
				};
			}

			const binding = resolveBinding(context, pluginOptions);
			await binding.delete(keys);

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
