import type { PluginOptions, PluginOptionsInternal } from "../types/types.js";

const pluginOptions = (given: PluginOptions): PluginOptionsInternal => {
	return {
		collections: given.collections.map((c) => {
			const fullSlug = c.ui?.fullSlug ?? false;

			return {
				collection: c.collection,
				localized: c.localized ?? false,
				prefix: c.prefix,
				ui: {
					fullSlug,
					tab: c.ui?.tab,
					widths: {
						fullSlug: c.ui?.widths?.fullSlug ?? (fullSlug ? 6 : 12),
						slug: c.ui?.widths?.slug ?? (fullSlug ? 6 : 12),
						parentPage: c.ui?.widths?.parentPage ?? 12,
					},
				},
				unique: c.unique ?? true,
				// fallbackSlugSource: c.fallbackSlugSource ?? undefined,
			};
		}),
	};
};

export default pluginOptions;
