import { definePlugin } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import s3StorageAdapter from "./adapter.js";
import { LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types/types.js";

/** Stores media in an S3-compatible bucket. Explicit project media.storage settings take precedence. */
const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		sources: { translations: ["@lucidcms/plugin-s3/translations"] },
		defaults: { media: { storage: s3StorageAdapter(pluginOptions) } },
	});
};

export default plugin;
