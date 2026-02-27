import type { MediaType } from "../../types.js";

/**
 * Gets the media type from a mime type.
 */
const getMediaType = (mimeType?: string | null): MediaType => {
	const mt = mimeType?.toLowerCase().split(";")[0]?.trim();
	if (!mt) return "unknown";
	if (mt.startsWith("image/")) return "image";
	if (mt.startsWith("video/")) return "video";
	if (mt.startsWith("audio/")) return "audio";
	if (
		mt === "application/pdf" ||
		mt.startsWith("application/vnd") ||
		mt.startsWith("text/")
	)
		return "document";
	if (
		mt.includes("zip") ||
		mt.includes("tar") ||
		mt.includes("gzip") ||
		mt.includes("diskimage")
	)
		return "archive";
	return "unknown";
};

export default getMediaType;
