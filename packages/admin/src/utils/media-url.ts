export type MediaImageFormat = "webp" | "avif" | "jpeg" | "png";
export type MediaImagePreset =
	| "thumbnail-small"
	| "thumbnail-medium"
	| "thumbnail-large";

export interface ProcessedImageUrlOptions {
	preset: MediaImagePreset;
	format: MediaImageFormat;
}

/** Appends image-processing options to a media URL. */
export const getProcessedImageUrl = (
	url: string,
	options: ProcessedImageUrlOptions,
): string => {
	const fragmentIndex = url.indexOf("#");
	const baseUrl = fragmentIndex === -1 ? url : url.slice(0, fragmentIndex);
	const fragment = fragmentIndex === -1 ? "" : url.slice(fragmentIndex);
	const separator = baseUrl.includes("?")
		? baseUrl.endsWith("?") || baseUrl.endsWith("&")
			? ""
			: "&"
		: "?";
	const query = new URLSearchParams({
		preset: options.preset,
		format: options.format,
	});

	return `${baseUrl}${separator}${query.toString()}${fragment}`;
};
