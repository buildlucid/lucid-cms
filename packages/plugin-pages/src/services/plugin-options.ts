import type { PluginOptions, PluginOptionsInternal } from "../types/types.js";

const pluginOptions = (given: PluginOptions): PluginOptionsInternal => {
	return {
		collections: given.collections.map((c) => ({
			collectionKey: c.collectionKey,
			localized: c?.localized ?? false,
			displayFullSlug: c?.displayFullSlug ?? false,
			prefix: c?.prefix,
			unique: c?.unique ?? true,
			// fallbackSlugSource: c?.fallbackSlugSource ?? undefined,
		})),
	};
};

export default pluginOptions;
