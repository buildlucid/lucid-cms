import type { MediaAdapterServiceDeleteSingle } from "@lucidcms/core/types";
import T from "../translations/index.js";
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
							? error.message
							: T("an_unknown_error_occurred"),
				},
				data: undefined,
			};
		}
	};
};

export default deleteSingle;
