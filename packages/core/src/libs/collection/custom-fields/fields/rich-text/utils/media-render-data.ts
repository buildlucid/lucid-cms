import type {
	RichTextHydratedImage,
	RichTextHydratedMedia,
} from "@lucidcms/rich-text";
import type { Media, MediaPoster } from "../../../../../../types/response.js";
import { getObject } from "../../../../../../utils/helpers/get-typed-value.js";

export const getLocalizedString = (value: unknown, locale: string): string => {
	const translations = getObject(value);
	if (!translations) return "";
	if (typeof translations[locale] === "string") return translations[locale];
	return (
		Object.values(translations).find(
			(item): item is string => typeof item === "string",
		) ?? ""
	);
};

const getImageRenderData = (
	reference: Extract<Media, { type: "image" }> | MediaPoster,
	locale: string,
): RichTextHydratedImage => {
	const title =
		("title" in reference ? getLocalizedString(reference.title, locale) : "") ||
		reference.file.fileName ||
		reference.file.key;

	return {
		src: reference.file.url,
		alt: getLocalizedString(reference.alt, locale) || title,
		title,
		mimeType: reference.file.meta.mimeType,
		width: reference.file.meta.width,
		height: reference.file.meta.height,
		base64: reference.file.meta.base64,
		averageColor: reference.file.meta.averageColor,
	};
};

/** Builds the compact, response-only media payload consumed by HTML rendering. */
export const getMediaRenderData = (
	reference: Media,
	locale: string,
): RichTextHydratedMedia => {
	const title =
		getLocalizedString(reference.title, locale) ||
		reference.file.fileName ||
		reference.file.key;

	if (reference.type === "image") {
		return {
			type: "image",
			...getImageRenderData(reference, locale),
		};
	}
	if (reference.type === "video") {
		return {
			type: "video",
			src: reference.file.url,
			title,
			mimeType: reference.file.meta.mimeType,
			poster: reference.poster
				? getImageRenderData(reference.poster, locale)
				: null,
		};
	}
	if (reference.type === "audio") {
		return {
			type: "audio",
			src: reference.file.url,
			title,
			mimeType: reference.file.meta.mimeType,
		};
	}

	return {
		type: reference.type,
		src: reference.file.url,
		title,
		fileName: reference.file.fileName || reference.file.key,
		mimeType: reference.file.meta.mimeType,
	};
};
