import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidPlugin } from "@lucidcms/core/types";
import type { PluginOptions } from "./types.js";
import redisKVAdapter from "./adapter.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			if (!draft.kv) {
				draft.kv = {
					adapter: redisKVAdapter(pluginOptions),
				};
			} else {
				draft.kv.adapter = redisKVAdapter(pluginOptions);
			}
		},
	};
};

export default plugin;
