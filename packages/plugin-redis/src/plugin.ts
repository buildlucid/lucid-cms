import { definePlugin } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import redisKVAdapter from "./adapter.js";
import { LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types.js";

/** Provides KV storage through Redis. Keys use the lucid namespace unless overridden. */
const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		defaults: { kv: { adapter: redisKVAdapter(pluginOptions) } },
	});
};

export default plugin;
