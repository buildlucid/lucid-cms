import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidPlugin } from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";
import cloudflareKVAdapter from "./adapter.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			if (!draft.kv) {
				draft.kv = {
					adapter: cloudflareKVAdapter(pluginOptions),
				};
			} else {
				draft.kv.adapter = cloudflareKVAdapter(pluginOptions);
			}
		},
	};
};

export default plugin;
