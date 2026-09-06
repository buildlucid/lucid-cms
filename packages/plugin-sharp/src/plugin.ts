import { definePlugin, LucidError } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import sharpMediaDeliveryAdapter from "./adapter/index.js";
import {
	LUCID_VERSION,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";

const plugin = (): LucidPluginDefinition => {
	return definePlugin({
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
		sources: { translations: ["@lucidcms/plugin-sharp/translations"] },
		defaults: { media: { delivery: sharpMediaDeliveryAdapter() } },
	});
};

export default plugin;
