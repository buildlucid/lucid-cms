import type { RichTextOptions } from "./types";

/** Controls the toolbar offers, in the order they are drawn. */
export type RichTextToolbarFeature =
	| "headings"
	| "bold"
	| "italic"
	| "underline"
	| "strikethrough"
	| "orderedList"
	| "bulletList"
	| "link"
	| "clearFormatting";

/** Whether the link control has anything to offer, external or internal. */
const linksEnabled = (options?: RichTextOptions) =>
	options?.links?.external !== false ||
	options?.links?.internal === true ||
	(Array.isArray(options?.links?.internal) &&
		options.links.internal.length > 0);

/**
 * Resolves which toolbar controls are on. Each defaults to enabled, so a
 * caller only has to name what it wants removed.
 */
export const getRichTextToolbarFeatures = (
	options?: RichTextOptions,
): Set<RichTextToolbarFeature> => {
	const features = new Set<RichTextToolbarFeature>();
	if (options?.headings !== false) features.add("headings");
	if (options?.bold !== false) features.add("bold");
	if (options?.italic !== false) features.add("italic");
	if (options?.underline !== false) features.add("underline");
	if (options?.strikethrough !== false) features.add("strikethrough");
	if (options?.orderedList !== false) features.add("orderedList");
	if (options?.bulletList !== false) features.add("bulletList");
	if (linksEnabled(options)) features.add("link");
	if (options?.clearFormatting !== false) features.add("clearFormatting");
	return features;
};
