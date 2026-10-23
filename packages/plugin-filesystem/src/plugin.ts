import { definePlugin } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import fileSystemStorageAdapter from "./adapter/index.js";
import {
	DEFAULT_UPLOAD_DIRECTORY,
	LUCID_VERSION,
	PLUGIN_KEY,
} from "./constants.js";
import routes from "./routes/index.js";
import type { PluginOptions } from "./types.js";

/** Stores media on the local filesystem and registers upload and download routes. Requires the Node runtime. */
const plugin = (pluginOptions?: PluginOptions): LucidPluginDefinition => {
	const uploadDir = pluginOptions?.uploadDir ?? DEFAULT_UPLOAD_DIRECTORY;

	return definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		cli: {
			module: "@lucidcms/plugin-filesystem/cli",
			options: { uploadDir },
		},
		sources: { translations: ["@lucidcms/plugin-filesystem/translations"] },
		defaults: {
			media: {
				storage: fileSystemStorageAdapter({
					uploadDir,
					secretKey: pluginOptions?.secretKey,
				}),
			},
		},
		configure: (draft) => {
			draft.http.routes.push(...routes());
		},
	});
};

export default plugin;
