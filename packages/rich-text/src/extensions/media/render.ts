import { escapeHTMLAttribute } from "@tiptap/static-renderer/json/html-string";
import type { RichTextHydratedMedia } from "../../types.js";

/** Renders the compact media data attached during document formatting. */
export const renderMediaNode = (media: unknown): string => {
	if (!media || typeof media !== "object") return "";
	const value = media as Partial<RichTextHydratedMedia>;
	if (typeof value.src !== "string") return "";

	if (value.type === "image") {
		return `<img src="${escapeHTMLAttribute(value.src)}" alt="${escapeHTMLAttribute(value.alt ?? "")}">`;
	}
	if (value.type === "audio") {
		return `<audio controls src="${escapeHTMLAttribute(value.src)}"></audio>`;
	}
	if (value.type === "video") {
		const poster = value.poster
			? ` poster="${escapeHTMLAttribute(value.poster)}"`
			: "";
		return `<video controls src="${escapeHTMLAttribute(value.src)}"${poster}></video>`;
	}

	return "";
};
