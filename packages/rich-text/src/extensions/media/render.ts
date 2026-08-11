import { isAllowedUri } from "@tiptap/extension-link";
import {
	escapeHTML,
	escapeHTMLAttribute,
} from "@tiptap/static-renderer/json/html-string";
import type {
	RichTextHydratedImage,
	RichTextHydratedMedia,
} from "../../types.js";

const renderDimensions = (image: RichTextHydratedImage): string => {
	const width = image.width ? ` width="${image.width}"` : "";
	const height = image.height ? ` height="${image.height}"` : "";
	return `${width}${height}`;
};

const getImageCandidates = (image: RichTextHydratedImage): string => {
	const candidates = image.presets
		.filter((preset) => preset.width)
		.sort((a, b) => (a.width ?? 0) - (b.width ?? 0))
		.map(
			(preset) =>
				`${escapeHTMLAttribute(preset.src)} ${preset.width as number}w`,
		);

	if (image.width) {
		candidates.push(`${escapeHTMLAttribute(image.src)} ${image.width}w`);
	}

	return candidates.join(", ");
};

const getSmallestImageSource = (image: RichTextHydratedImage): string =>
	[...image.presets].sort(
		(a, b) =>
			(a.width ?? a.height ?? Number.MAX_SAFE_INTEGER) -
			(b.width ?? b.height ?? Number.MAX_SAFE_INTEGER),
	)[0]?.src ?? image.src;

const renderPlaceholderAttributes = (
	image: RichTextHydratedImage,
	marker: string,
): string => {
	const styles = [
		image.base64
			? `background-image:url(&quot;${escapeHTMLAttribute(image.base64)}&quot;)`
			: "",
		image.averageColor
			? `background-color:${escapeHTMLAttribute(image.averageColor)}`
			: "",
		image.base64 ? "background-position:center" : "",
		image.base64 ? "background-repeat:no-repeat" : "",
		image.base64 ? "background-size:cover" : "",
	].filter(Boolean);

	if (styles.length === 0) return "";
	return ` ${marker}="" style="${styles.join(";")}"`;
};

const renderImage = (image: RichTextHydratedImage): string => {
	const srcSet = getImageCandidates(image);
	const source = srcSet ? `<source srcset="${srcSet}">` : "";
	const placeholder = renderPlaceholderAttributes(
		image,
		"data-lucid-rich-text-image-placeholder",
	);

	return `<picture data-lucid-rich-text-picture="">${source}<img data-lucid-rich-text-image="" src="${escapeHTMLAttribute(getSmallestImageSource(image))}" alt="${escapeHTMLAttribute(image.alt)}"${image.title ? ` title="${escapeHTMLAttribute(image.title)}"` : ""}${renderDimensions(image)} loading="lazy" decoding="async"${placeholder}></picture>`;
};

const renderVideo = (
	media: Extract<RichTextHydratedMedia, { type: "video" }>,
): string => {
	const poster = media.poster;
	const posterSrc = poster
		? ` poster="${escapeHTMLAttribute(getSmallestImageSource(poster))}"`
		: "";
	const posterSrcSet = poster ? getImageCandidates(poster) : "";
	const posterData = posterSrcSet
		? ` data-lucid-rich-text-poster-srcset="${posterSrcSet}"`
		: "";
	const placeholder = poster
		? renderPlaceholderAttributes(
				poster,
				"data-lucid-rich-text-poster-placeholder",
			)
		: "";
	const sourceType = media.mimeType
		? ` type="${escapeHTMLAttribute(media.mimeType)}"`
		: "";

	return `<video data-lucid-rich-text-video="" controls preload="metadata"${posterSrc}${posterData}${placeholder}><source src="${escapeHTMLAttribute(media.src)}"${sourceType}></video>`;
};

/** Renders the compact media data attached during document formatting. */
export const renderMediaNode = (media: unknown): string => {
	if (!media || typeof media !== "object") return "";
	const value = media as RichTextHydratedMedia;
	if (typeof value.src !== "string" || !isAllowedUri(value.src)) return "";

	if (value.type === "image") return renderImage(value);
	if (value.type === "video") return renderVideo(value);
	if (value.type === "audio") {
		const sourceType = value.mimeType
			? ` type="${escapeHTMLAttribute(value.mimeType)}"`
			: "";
		return `<audio data-lucid-rich-text-audio="" controls preload="metadata"><source src="${escapeHTMLAttribute(value.src)}"${sourceType}></audio>`;
	}

	if (
		value.type === "document" ||
		value.type === "archive" ||
		value.type === "unknown"
	) {
		const label = value.title || value.fileName;
		return `<a data-lucid-rich-text-file="${value.type}" href="${escapeHTMLAttribute(value.src)}">${escapeHTML(label)}</a>`;
	}

	return "";
};
