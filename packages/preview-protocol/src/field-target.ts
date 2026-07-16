import {
	previewFieldAttributePrefix,
	previewProtocolLimits,
} from "./constants.js";
import type { PreviewFieldTarget } from "./types.js";
import { isPreviewFieldTarget } from "./validators.js";

/** Encodes a validated field target for safe use in preview markup. */
export const encodePreviewFieldTarget = (
	target: PreviewFieldTarget,
): string | null => {
	if (!isPreviewFieldTarget(target)) return null;

	const encoded = `${previewFieldAttributePrefix}${encodeURIComponent(
		JSON.stringify(target),
	)}`;
	return encoded.length <= previewProtocolLimits.attributeLength
		? encoded
		: null;
};

/** Decodes untrusted preview markup into a validated field target. */
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
