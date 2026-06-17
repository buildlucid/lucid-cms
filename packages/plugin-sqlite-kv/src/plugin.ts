import type { LucidPluginResponse } from "@lucidcms/core/types";
import sqliteKVAdapter from "./adapter.js";
import { LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types.js";

const plugin = (pluginOptions?: PluginOptions): LucidPluginResponse => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			draft.i18n.sources.push("@lucidcms/plugin-sqlite-kv/translations");
			if (!draft.kv) {
				draft.kv = {
					adapter: sqliteKVAdapter(pluginOptions),
				};
			} else {
				draft.kv.adapter = sqliteKVAdapter(pluginOptions);
			}
		},
	};
};

export default plugin;
