import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceDeleteMultiple } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";
import { resolveBinding } from "../utils/resolve-binding.js";

const deleteMultiple = (
	pluginOptions: PluginOptions,
): MediaStorageAdapterServiceDeleteMultiple => {
	return async (context, { keys }) => {
		try {
			if (keys.length === 0) {
				return;
			}

			const binding = resolveBinding(context, pluginOptions);
			await binding.delete(keys);

			return;
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

export default deleteMultiple;
