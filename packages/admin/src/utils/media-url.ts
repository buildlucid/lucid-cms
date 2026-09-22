import type { MediaFile } from "@types";

/**
 * The presets the admin ships with. A project can configure others, so any
 * string is accepted.
 */
export type MediaPreset =
	| "thumbnail-small"
	| "thumbnail-medium"
	| "thumbnail-large";

/**
 * Builds the URL for a piece of media at the given preset, falling back to the
 * original when the delivery adapter cannot resize on request.
 *
 * @example
 * ```tsx
 * import { mediaUrl } from "@lucidcms/admin/utils";
 *
 * return <img src={mediaUrl(media, "thumbnail-small")} alt={media.alt} />;
 * ```
 */
const mediaUrl = (
	media: Pick<MediaFile, "url"> & {
		delivery?: MediaFile["delivery"];
	},
	//* the union keeps the built-ins suggested without shutting out a
	//* project's own presets
	preset: MediaPreset | (string & {}),
) => {
	if (media.delivery?.supportsPresetQuery !== true) return media.url;

	const url = new URL(media.url);
	url.searchParams.set("preset", preset);
	return url.toString();
};

export default mediaUrl;
