import type { MediaFile } from "@types";

/** The built in presets. Any configured preset name is also accepted. */
export type MediaPreset =
	| "thumbnail-small"
	| "thumbnail-medium"
	| "thumbnail-large";

/**
 * Returns a media URL resized to a preset, or the original URL when the media
 * adapter cannot resize.
 *
 * @example
 * ```tsx
 * import { mediaUrl } from "@lucidcms/admin/utils";
 *
 * return <img src={mediaUrl(media, "thumbnail-small")} alt={media.alt ?? ""} />;
 * ```
 */
const mediaUrl = (
	media: Pick<MediaFile, "url"> & {
		delivery?: MediaFile["delivery"];
	},
	//* keeps autocomplete for built in presets while allowing any string
	preset: MediaPreset | (string & {}),
) => {
	if (media.delivery?.supportsPresetQuery !== true) return media.url;

	const url = new URL(media.url);
	url.searchParams.set("preset", preset);
	return url.toString();
};

export default mediaUrl;
