import type { MediaFile } from "@types";

export type AdminImagePreset =
	| "thumbnail-small"
	| "thumbnail-medium"
	| "thumbnail-large";

/** Uses Lucid's preset query contract when the admin response says it is supported. */
const getMediaPreviewUrl = (
	media: Pick<MediaFile, "url"> & {
		delivery?: MediaFile["delivery"];
	},
	preset: AdminImagePreset,
) => {
	if (media.delivery?.supportsPresetQuery !== true) return media.url;

	const url = new URL(media.url);
	url.searchParams.set("preset", preset);
	return url.toString();
};

export default getMediaPreviewUrl;
