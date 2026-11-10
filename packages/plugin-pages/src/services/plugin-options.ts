import type { PluginOptions, PluginOptionsInternal } from "../types/types.js";

/** Fills in defaults for the plugin options given by the user. */
const pluginOptions = (given: PluginOptions): PluginOptionsInternal => {
	const redirectSettings =
		typeof given.redirects === "object" ? given.redirects : {};
	const redirects =
		given.redirects === false
			? false
			: {
					...redirectSettings,
					trackPathChanges: redirectSettings.trackPathChanges ?? true,
				};

	return {
		redirects,
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
				trackPaths: redirects !== false && redirects.trackPathChanges,
			};
		}),
	};
};

export default pluginOptions;
