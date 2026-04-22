import type { MediaAdapterServiceRenameKey } from "@lucidcms/core/types";
import T from "../translations/index.js";
import type { PluginOptions } from "../types.js";

const rename = (pluginOptions: PluginOptions): MediaAdapterServiceRenameKey => {
	return async (props) => {
		try {
			const source = await pluginOptions.binding.get(props.from);

			if (!source) {
				return {
					error: {
						type: "plugin",
						message: T("copy_source_missing"),
					},
					data: undefined,
				};
			}

			if (!source.body) {
				return {
					error: {
						type: "plugin",
						message: T("object_body_undefined"),
					},
					data: undefined,
				};
			}

			await pluginOptions.binding.put(props.to, source.body, {
				httpMetadata: source.httpMetadata,
				customMetadata: source.customMetadata,
				storageClass: source.storageClass,
			});

			const target = await pluginOptions.binding.head(props.to);
			if (!target || target.size !== source.size) {
				await pluginOptions.binding.delete(props.to);

				return {
					error: {
						type: "plugin",
						message: T("copy_failed"),
					},
					data: undefined,
				};
			}

			try {
				await pluginOptions.binding.delete(props.from);
			} catch (error) {
				await pluginOptions.binding.delete(props.to);
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
							? error.message
							: T("an_unknown_error_occurred"),
				},
				data: undefined,
			};
		}
	};
};

export default rename;
