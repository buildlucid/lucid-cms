import { mergeTranslationBundles } from "@lucidcms/core/plugin";
import type { LucidPlugin } from "@lucidcms/core/types";
import s3MediaAdapter from "./adapter.js";
import { LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import serverTranslations from "./translations/en.server.json" with {
	type: "json",
};
import type { PluginOptions } from "./types/types.js";

const plugin: LucidPlugin<PluginOptions> = (pluginOptions) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			draft.i18n.translations = mergeTranslationBundles(
				draft.i18n.translations,
				{ en: { server: serverTranslations } },
			);
			draft.media.adapter = s3MediaAdapter(pluginOptions);
		},
	};
};

export default plugin;
