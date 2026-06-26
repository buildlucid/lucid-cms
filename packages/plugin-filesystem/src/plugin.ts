import type { LucidPluginResponse } from "@lucidcms/core/types";
import fileSystemMediaAdapter from "./adapter/index.js";
import {
	DEFAULT_UPLOAD_DIRECTORY,
	LUCID_VERSION,
	PLUGIN_KEY,
} from "./constants.js";
import routes from "./routes/index.js";
import type { PluginOptions } from "./types.js";

const plugin = (pluginOptions?: PluginOptions): LucidPluginResponse => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			draft.i18n.sources.push("@lucidcms/plugin-filesystem/translations");
			draft.media.adapter = fileSystemMediaAdapter({
				uploadDir: pluginOptions?.uploadDir ?? DEFAULT_UPLOAD_DIRECTORY,
				secretKey: pluginOptions?.secretKey ?? draft.secrets.encryption,
			});
			draft.http.routes.push(...routes());
		},
	};
};

export default plugin;
