import type { MediaAdapterServiceDeleteMultiple } from "@lucidcms/core/types";
import T from "../translations/index.js";
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
							? error.message
							: T("an_unknown_error_occurred"),
				},
				data: undefined,
			};
		}
	};
};

export default deleteMultiple;
