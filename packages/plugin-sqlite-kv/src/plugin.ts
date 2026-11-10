import { definePlugin } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import sqliteKVAdapter from "./adapter.js";
import { PACKAGE_INFO, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types.js";

/** Provides KV storage in Lucid's database. Requires a SQLite-compatible database adapter. */
const plugin = (pluginOptions?: PluginOptions): LucidPluginDefinition => {
	return definePlugin({
		key: PLUGIN_KEY,
		package: PACKAGE_INFO,
		sources: { translations: ["@lucidcms/sqlite-kv/translations"] },
		defaults: { kv: { adapter: sqliteKVAdapter(pluginOptions) } },
	});
};

export default plugin;
