import { definePlugin } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import fileSystemStorageAdapter from "./adapter/index.js";
import {
	DEFAULT_UPLOAD_DIRECTORY,
	PACKAGE_INFO,
	PLUGIN_KEY,
} from "./constants.js";
import routes from "./routes/index.js";
import type { PluginOptions } from "./types.js";

/** Stores media on the local filesystem and registers upload and download routes. Requires the Node runtime. */
const plugin = (pluginOptions?: PluginOptions): LucidPluginDefinition => {
	const uploadDir = pluginOptions?.uploadDir ?? DEFAULT_UPLOAD_DIRECTORY;

	return definePlugin({
		key: PLUGIN_KEY,
		package: PACKAGE_INFO,
		cli: {
			module: "@lucidcms/filesystem/cli",
			options: { uploadDir },
		},
		sources: { translations: ["@lucidcms/filesystem/translations"] },
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
