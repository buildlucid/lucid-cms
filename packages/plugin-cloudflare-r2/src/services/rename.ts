import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceRenameKey } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";
import { resolveBinding } from "../utils/resolve-binding.js";

const rename = (pluginOptions: PluginOptions): MediaAdapterServiceRenameKey => {
	return async (context, props) => {
		try {
			const binding = resolveBinding(context, pluginOptions);
			const source = await binding.get(props.from);

			if (!source) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.r2.objects.copy.source.missing",
						),
					},
					data: undefined,
				};
			}

			if (!source.body) {
				return {
					error: {
						type: "plugin",
						message: copy("server:plugin.cloudflare.r2.objects.body.missing"),
					},
					data: undefined,
				};
			}

			await binding.put(props.to, source.body, {
				httpMetadata: source.httpMetadata,
				customMetadata: source.customMetadata,
				storageClass: source.storageClass,
			});

			const target = await binding.head(props.to);
			if (!target || target.size !== source.size) {
				await binding.delete(props.to);

				return {
					error: {
						type: "plugin",
						message: copy("server:plugin.cloudflare.r2.objects.copy.failed"),
					},
					data: undefined,
				};
			}

			try {
				await binding.delete(props.from);
			} catch (error) {
				await binding.delete(props.to);
				throw error;
			}

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

export default rename;
