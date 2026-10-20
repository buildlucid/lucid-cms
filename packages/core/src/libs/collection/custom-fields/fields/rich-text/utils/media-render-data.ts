import type {
	RichTextHydratedImage,
	RichTextHydratedMedia,
} from "@lucidcms/rich-text";
import type { Media, MediaPoster } from "../../../../../../types/response.js";
import { getObject } from "../../../../../../utils/helpers/get-typed-value.js";
import formatter from "../../../../../formatters/helpers.js";
import type { CustomFieldResponseFormatContext } from "../../../types.js";

/** The locale rich text reads referenced text in, and the one empty translations fall back to. */
export type RichTextTextLocale = Pick<
	CustomFieldResponseFormatContext,
	"locale" | "fallbackLocale"
>;

/** Reads text using the locale and fallback, or the first translation without a locale, returning `""` when no string exists. */
export const getLocalizedString = (
	value: unknown,
	read: RichTextTextLocale,
): string => {
	if (typeof value === "string") return value;
	const translations = getObject(value);
	if (!translations) return "";
	if (read.locale !== null) {
		const translation = formatter.pickTranslation(translations, {
			locale: read.locale,
			fallbackLocale: read.fallbackLocale ?? null,
		});
		return typeof translation === "string" ? translation : "";
	}
	return (
		Object.values(translations).find(
			(item): item is string => typeof item === "string",
		) ?? ""
	);
};

const getImageRenderData = (
	reference: Extract<Media, { type: "image" }> | MediaPoster,
	read: RichTextTextLocale,
): RichTextHydratedImage => {
	const title =
		("title" in reference ? getLocalizedString(reference.title, read) : "") ||
		reference.fileName ||
		reference.key;

	return {
		src: reference.url,
		alt: getLocalizedString(reference.alt, read) || title,
		title,
		mimeType: reference.meta.mimeType,
		width: reference.meta.width,
		height: reference.meta.height,
		base64: reference.meta.base64,
		averageColor: reference.meta.averageColor,
	};
};

/** Builds the compact, response-only media payload consumed by HTML rendering. */
export const getMediaRenderData = (
	reference: Media,
	read: RichTextTextLocale,
): RichTextHydratedMedia => {
	const title =
		getLocalizedString(reference.title, read) ||
		reference.fileName ||
		reference.key;

	if (reference.type === "image") {
		return {
			type: "image",
			...getImageRenderData(reference, read),
		};
	}
	if (reference.type === "video") {
		return {
			type: "video",
			src: reference.url,
			title,
			mimeType: reference.meta.mimeType,
			poster: reference.poster
				? getImageRenderData(reference.poster, read)
				: null,
		};
	}
	if (reference.type === "audio") {
		return {
			type: "audio",
			src: reference.url,
			title,
			mimeType: reference.meta.mimeType,
		};
	}

	return {
		type: reference.type,
		src: reference.url,
		title,
		fileName: reference.fileName || reference.key,
		mimeType: reference.meta.mimeType,
	};
};
