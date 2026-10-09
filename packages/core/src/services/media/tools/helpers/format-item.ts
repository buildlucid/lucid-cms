import type z from "zod";
import type { Media } from "../../../../types/response.js";
import type { mediaItemSchema } from "./schema.js";
import translateText from "./translate-text.js";

/** Formats media for tool output in one content locale, without storage keys or private URLs. */
const formatMediaItem = (
	media: Media,
	locale: string | null,
): z.output<typeof mediaItemSchema> => ({
	id: media.id,
	type: media.type,
	status: media.status,
	title: translateText(media.title, locale),
	alt:
		media.type === "image"
			? translateText(media.alt, locale)
			: media.type === "video" && media.poster
				? translateText(media.poster.alt, locale)
				: null,
	description:
		media.type === "video" || media.type === "audio"
			? translateText(media.description, locale)
			: media.type === "document"
				? translateText(media.summary, locale)
				: null,
	fileName: media.fileName,
	mimeType: media.meta.mimeType,
	width:
		media.type === "image" || media.type === "video" ? media.meta.width : null,
	height:
		media.type === "image" || media.type === "video" ? media.meta.height : null,
	public: media.public,
	url: media.public ? media.url || null : null,
	fileSize: media.meta.fileSize,
	folderId: media.folderId,
	personal: media.ownership.type === "user",
	createdAt: media.createdAt,
	updatedAt: media.updatedAt,
});

export default formatMediaItem;
