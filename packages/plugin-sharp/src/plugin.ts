import { LucidError } from "@lucidcms/core";
import type { LucidPluginResponse } from "@lucidcms/core/types";
import sharpMediaDeliveryAdapter from "./adapter/index.js";
import {
	LUCID_VERSION,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";

const plugin = (): LucidPluginResponse => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		checkCompatibility: ({ runtimeContext }) => {
			if (runtimeContext.runtime !== SUPPORTED_RUNTIME_ADAPTER_KEY) {
				throw new LucidError({
					message:
						"Sharp plugin is only supported on the Node runtime adapter.",
				});
			}
		},
		recipe: (draft) => {
			draft.i18n.sources.push("@lucidcms/plugin-sharp/translations");
			draft.media.delivery = sharpMediaDeliveryAdapter();
		},
	};
};

export default plugin;
