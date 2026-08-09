import type { PluginOptions, PluginOptionsInternal } from "../types/types.js";

const pluginOptions = (given: PluginOptions): PluginOptionsInternal => {
	return {
		collections: given.collections.map((c) => {
			const fullSlug = c.ui?.fullSlug ?? false;
			const segmentWidth = c.segments && c.segments.length > 1 ? 6 : 12;

			return {
				key: c.key,
				localized: c.localized ?? false,
				prefix: c.prefix,
				segments: c.segments ?? [],
				ui: {
					fullSlug,
					tab: c.ui?.tab,
					widths: {
						fullSlug: c.ui?.widths?.fullSlug ?? (fullSlug ? 6 : 12),
						slug: c.ui?.widths?.slug ?? (fullSlug ? 6 : 12),
						parentPage: c.ui?.widths?.parentPage ?? 12,
						segments: c.ui?.widths?.segments ?? segmentWidth,
					},
				},
				unique: c.unique ?? true,
				// fallbackSlugSource: c.fallbackSlugSource ?? undefined,
			};
		}),
	};
};

export default pluginOptions;
