import type { LucidConfig } from "@lucidcms/core/types";
import type { Variant } from "#harness/config";

/** The limits the `media-limits` variant sets, small enough to reach with kilobyte fixtures. */
export const MEDIA_LIMITS = {
	uploadBytes: 16 * 1024,
	storageBytes: 48 * 1024,
	maxVariantsPerFile: 2,
} as const;

/** A preset every setup offers, for image processing tests. */
export const IMAGE_PRESET = {
	name: "harness-square",
	width: 4,
	height: 4,
	format: "webp",
} as const;

/** Where the CDN sends a browser asking for a missing image with `?fallback=1`. Nothing answers it. */
export const FALLBACK_IMAGE_URL = "https://fallback.invalid/missing.png";

/**
 * Media options every setup shares: one preset and an image fallback. The `media-limits` variant
 * lowers the upload, storage and variant limits, and lets requests choose an image format so a
 * file can have several variants.
 */
export const mediaConfig = (env: { HARNESS_VARIANT?: Variant }) => {
	const limited = env.HARNESS_VARIANT === "media-limits";
	return {
		media: {
			...(limited && {
				limits: {
					uploadBytes: MEDIA_LIMITS.uploadBytes,
					storageBytes: MEDIA_LIMITS.storageBytes,
				},
			}),
			images: {
				presets: {
					[IMAGE_PRESET.name]: {
						width: IMAGE_PRESET.width,
						height: IMAGE_PRESET.height,
						format: IMAGE_PRESET.format,
					},
				},
				fallbackUrl: FALLBACK_IMAGE_URL,
				...(limited && {
					allowFormatQuery: true,
					cache: {
						enabled: true,
						maxVariantsPerFile: MEDIA_LIMITS.maxVariantsPerFile,
					},
				}),
			},
		},
	} satisfies Pick<LucidConfig, "media">;
};
