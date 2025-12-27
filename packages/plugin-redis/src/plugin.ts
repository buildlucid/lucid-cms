import type { LucidPlugin } from "@lucidcms/core/types";
import redisKVAdapter from "./adapter.js";
import { LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types.js";

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
