import type { LucidPlugin } from "@lucidcms/core/types";
import s3MediaAdapter from "./adapter.js";
import { LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import type { PluginOptions } from "./types/types.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			draft.i18n.sources.push("@lucidcms/plugin-s3/translations");
			draft.media.adapter = s3MediaAdapter(pluginOptions);
		},
	};
};

export default plugin;
