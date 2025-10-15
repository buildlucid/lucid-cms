import type { PluginOptions, PluginOptionsInternal } from "../types/types.js";

const pluginOptions = (given: PluginOptions): PluginOptionsInternal => {
	return {
		collections: given.collections.map((c) => ({
			collectionKey: c.collectionKey,
			useTranslations: c?.useTranslations ?? false,
			displayFullSlug: c?.displayFullSlug ?? false,
			// fallbackSlugSource: c?.fallbackSlugSource ?? undefined,
		})),
	};
};

export default pluginOptions;
