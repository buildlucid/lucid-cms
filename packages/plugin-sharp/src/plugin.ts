import { definePlugin, LucidError } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import sharpMediaDeliveryAdapter from "./adapter/index.js";
import {
	PACKAGE_INFO,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";

/** Processes and delivers images with Sharp on the Node runtime. */
const plugin = (): LucidPluginDefinition => {
	return definePlugin({
		key: PLUGIN_KEY,
		package: PACKAGE_INFO,
		checkCompatibility: ({ runtimeContext }) => {
			if (runtimeContext.runtime !== SUPPORTED_RUNTIME_ADAPTER_KEY) {
				throw new LucidError({
					message:
						"Sharp plugin is only supported on the Node runtime adapter.",
				});
			}
		},
		sources: { translations: ["@lucidcms/sharp/translations"] },
		defaults: { media: { deliveryAdapter: sharpMediaDeliveryAdapter() } },
	});
};

export default plugin;
