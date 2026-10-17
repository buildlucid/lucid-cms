import {
	encodePreviewFieldTarget,
	type PreviewFieldTarget,
	previewFieldAttribute,
} from "@lucidcms/preview-protocol";

export type { PreviewFieldTarget };

/** Returns preview attributes for `<h1${previewFieldMarkup(target)}>`, empty for invalid targets. */
export const previewFieldMarkup = (target: PreviewFieldTarget): string => {
	const encoded = encodePreviewFieldTarget(target);
	return encoded ? ` ${previewFieldAttribute}="${encoded}"` : "";
};
