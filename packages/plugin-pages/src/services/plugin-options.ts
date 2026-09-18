import type { PluginOptions, PluginOptionsInternal } from "../types/types.js";

const pluginOptions = (given: PluginOptions): PluginOptionsInternal => {
	return {
		collections: given.collections.map((c) => {
			const segmentWidth = c.segments && c.segments.length > 1 ? 6 : 12;

			return {
				key: c.key,
				localized: c.localized ?? false,
				prefix: c.prefix,
				segments: c.segments ?? [],
				ui: {
					placement: c.ui?.placement ?? { at: "end" },
					widths: {
						slug: c.ui?.widths?.slug ?? 12,
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
