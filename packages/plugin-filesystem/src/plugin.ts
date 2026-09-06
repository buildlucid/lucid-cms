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

const plugin = (pluginOptions?: PluginOptions): LucidPluginDefinition => {
	return definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		sources: { translations: ["@lucidcms/plugin-filesystem/translations"] },
		defaults: {
			media: {
				storage: fileSystemStorageAdapter({
					uploadDir: pluginOptions?.uploadDir ?? DEFAULT_UPLOAD_DIRECTORY,
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
