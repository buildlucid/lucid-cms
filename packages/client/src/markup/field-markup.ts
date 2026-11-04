import type { PreviewFieldTarget } from "@lucidcms/types";

export type { PreviewFieldTarget };

//* the markup Lucid's preview page script reads: this attribute, holding a version prefix and the encoded target
export const previewFieldAttribute = "data-lucid-preview-field";
const previewFieldPrefix = "1:";
const maxAttributeLength = 4096;

/** Encodes a field target for preview markup, or returns null when it's too long to mark. */
export const encodePreviewFieldTarget = (
	target: PreviewFieldTarget,
): string | null => {
	const encoded = `${previewFieldPrefix}${encodeURIComponent(JSON.stringify(target))}`;
	return encoded.length <= maxAttributeLength ? encoded : null;
};

/** Returns preview attributes for `<h1${previewFieldMarkup(target)}>`, empty for missing or oversized targets. */
export const previewFieldMarkup = (
	target: PreviewFieldTarget | null,
): string => {
	const encoded = target ? encodePreviewFieldTarget(target) : null;
	return encoded ? ` ${previewFieldAttribute}="${encoded}"` : "";
};
