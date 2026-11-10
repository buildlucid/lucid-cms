import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceDeleteSingle } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";
import { resolveBinding } from "../utils/resolve-binding.js";

const deleteSingle = (
	pluginOptions: PluginOptions,
): MediaStorageAdapterServiceDeleteSingle => {
	return async (context, { key }) => {
		try {
			const binding = resolveBinding(context, pluginOptions);
			await binding.delete(key);

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

export default deleteSingle;
