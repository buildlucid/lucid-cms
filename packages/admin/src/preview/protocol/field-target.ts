import {
	previewFieldAttributePrefix,
	previewProtocolLimits,
} from "./constants.js";
import type { PreviewFieldTarget } from "./types.js";
import { isPreviewFieldTarget } from "./validators.js";

/** Decodes the markup `@lucidcms/client` writes into a field target. Returns null for invalid or unsupported values. */
export const decodePreviewFieldTarget = (
	value: string,
): PreviewFieldTarget | null => {
	if (
		value.length > previewProtocolLimits.attributeLength ||
		!value.startsWith(previewFieldAttributePrefix)
	) {
		return null;
	}

	try {
		const decoded = JSON.parse(
			decodeURIComponent(value.slice(previewFieldAttributePrefix.length)),
		);
		return isPreviewFieldTarget(decoded) ? decoded : null;
	} catch {
		return null;
	}
};
