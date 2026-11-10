import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceRenameKey } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";
import { resolveBinding } from "../utils/resolve-binding.js";

const rename = (
	pluginOptions: PluginOptions,
): MediaStorageAdapterServiceRenameKey => {
	return async (context, props) => {
		try {
			const binding = resolveBinding(context, pluginOptions);
			const source = await binding.get(props.from);

			if (!source) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.r2.objects.copy.source.missing",
					),
				});
			}

			if (!source.body) {
				throw new LucidError({
					type: "plugin",
					message: copy("server:plugin.cloudflare.r2.objects.body.missing"),
				});
			}

			await binding.put(props.to, source.body, {
				httpMetadata: source.httpMetadata,
				customMetadata: source.customMetadata,
				storageClass: source.storageClass,
			});

			const target = await binding.head(props.to);
			if (!target || target.size !== source.size) {
				await binding.delete(props.to);

				throw new LucidError({
					type: "plugin",
					message: copy("server:plugin.cloudflare.r2.objects.copy.failed"),
				});
			}

			try {
				await binding.delete(props.from);
			} catch (error) {
				if (error instanceof LucidError) throw error;
				await binding.delete(props.to);
				throw error;
			}

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

export default rename;
