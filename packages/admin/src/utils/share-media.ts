import type { Media } from "@types";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

/** Set while the share sheet is open, as a second share call fails until it closes. */
let sharing = false;

/** Builds a shareable file, empty for support checks. */
const createMediaShareFile = (media: Media, contents: BlobPart[] = []) =>
	new File(
		contents,
		media.fileName ?? `media-${media.id}.${media.meta.extension}`,
		{ type: media.meta.mimeType },
	);

/** Checks browser support for sharing this media type. */
export const canShareMediaFile = (media: Media) =>
	typeof navigator.canShare === "function" &&
	navigator.canShare({ files: [createMediaShareFile(media)] });

/** Fetches and shares the file. Call from a click; slow downloads may outlast browser activation. */
export const shareMediaFile = async (media: Media) => {
	if (sharing) return;
	sharing = true;

	try {
		const response = await fetch(media.url, { credentials: "include" });
		if (!response.ok) throw new Error("Unable to fetch the media file.");

		await navigator.share({
			files: [createMediaShareFile(media, [await response.blob()])],
		});
	} catch (error) {
		//* closing the share sheet rejects with an AbortError
		if (error instanceof DOMException && error.name === "AbortError") return;
		spawnToast({
			title: T()("toasts.common.share.error"),
			status: "error",
		});
	} finally {
		sharing = false;
	}
};
