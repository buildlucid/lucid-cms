import type { MediaType } from "../../types.js";

/**
 * Gets the media type from a mime type.
 */
const getMediaType = (mimeType?: string | null): MediaType => {
	const mt = mimeType?.toLowerCase();
	if (!mt) return "unknown";
	if (mt.includes("image")) return "image";
	if (mt.includes("video")) return "video";
	if (mt.includes("audio")) return "audio";
	if (mt.includes("pdf") || mt.startsWith("application/vnd")) return "document";
	if (mt.includes("zip") || mt.includes("tar")) return "archive";
	return "unknown";
};

export default getMediaType;
