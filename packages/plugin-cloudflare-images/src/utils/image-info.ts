/** Image metadata returned for raster sources by the Images binding. */
export type RasterImageInfo = Extract<ImageInfoResponse, { width: number }>;

/** Whether a binding metadata response contains a source format. */
export const hasImageFormat = (info: unknown): info is { format: string } =>
	typeof info === "object" &&
	info !== null &&
	"format" in info &&
	typeof info.format === "string";

/**
 * Narrows a binding metadata response to finite, positive raster dimensions.
 * SVG metadata is intentionally excluded because it has no raster geometry.
 */
export const isRasterImageInfo = (info: unknown): info is RasterImageInfo =>
	hasImageFormat(info) &&
	"width" in info &&
	typeof info.width === "number" &&
	Number.isFinite(info.width) &&
	info.width > 0 &&
	"height" in info &&
	typeof info.height === "number" &&
	Number.isFinite(info.height) &&
	info.height > 0 &&
	"fileSize" in info &&
	typeof info.fileSize === "number" &&
	Number.isFinite(info.fileSize) &&
	info.fileSize >= 0;
