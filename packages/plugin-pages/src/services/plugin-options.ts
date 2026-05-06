import type { PluginOptions, PluginOptionsInternal } from "../types/types.js";

const pluginOptions = (given: PluginOptions): PluginOptionsInternal => {
	return {
		collections: given.collections.map((c) => ({
			collectionKey: c.collectionKey,
			translations: c?.translations ?? false,
			displayFullSlug: c?.displayFullSlug ?? false,
			prefix: c?.prefix,
			// fallbackSlugSource: c?.fallbackSlugSource ?? undefined,
		})),
	};
};

export default pluginOptions;
