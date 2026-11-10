import { definePlugin } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import s3StorageAdapter from "./adapter.js";
import { PACKAGE_INFO, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types/types.js";

/** Stores media in an S3-compatible bucket. Explicit project media.storageAdapter settings take precedence. */
const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return definePlugin({
		key: PLUGIN_KEY,
		package: PACKAGE_INFO,
		sources: { translations: ["@lucidcms/s3/translations"] },
		defaults: { media: { storageAdapter: s3StorageAdapter(pluginOptions) } },
	});
};

export default plugin;
