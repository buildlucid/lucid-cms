import type { MediaTransformationOptions } from "@lucidcms/core/types";
import { isSupportedOutputFormat } from "./image-formats.js";

const ROTATIONS = [0, 90, 180, 270] as const;

/** Whether a direct processor call contains a supported quarter-turn rotation. */
export const isSupportedRotation = (
	rotate: unknown,
): rotate is NonNullable<MediaTransformationOptions["rotate"]> =>
	ROTATIONS.some((supportedRotation) => supportedRotation === rotate);

/** Whether a direct processor call contains a supported output format. */
export const isSupportedFormat = (format: unknown) =>
	isSupportedOutputFormat(format);

/** Whether a direct processor call contains a valid Cloudflare quality value. */
export const isValidQuality = (quality: unknown): quality is number =>
	typeof quality === "number" &&
	Number.isInteger(quality) &&
	quality >= 1 &&
	quality <= 100;
