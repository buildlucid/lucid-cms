import type {
	RichTextHydratedImage,
	RichTextHydratedImagePreset,
	RichTextHydratedMedia,
} from "@lucidcms/rich-text";
import type {
	Media,
	MediaImage,
	MediaPoster,
} from "../../../../../../types/response.js";
import { getObject } from "../../../../../../utils/helpers/get-typed-value.js";
import type { CustomFieldResponseFormatContext } from "../../../types.js";

type ImagePresetConfig = NonNullable<
	CustomFieldResponseFormatContext["mediaImagePresets"]
>[string];

const presetMimeTypes = {
	avif: "image/avif",
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
} as const;

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

const appendPresetQuery = (url: string, preset: string): string => {
	const fragmentIndex = url.indexOf("#");
	const baseUrl = fragmentIndex === -1 ? url : url.slice(0, fragmentIndex);
	const fragment = fragmentIndex === -1 ? "" : url.slice(fragmentIndex);
	const separator = baseUrl.includes("?")
		? baseUrl.endsWith("?") || baseUrl.endsWith("&")
			? ""
			: "&"
		: "?";

	return `${baseUrl}${separator}${new URLSearchParams({ preset }).toString()}${fragment}`;
};

/** Resolves the expected output dimensions for a configured image preset. */
const getPresetDimensions = (
	preset: ImagePresetConfig,
	sourceWidth: number | null,
	sourceHeight: number | null,
): { width: number | null; height: number | null } => {
	let width = preset.width ?? null;
	let height = preset.height ?? null;

	if (width === null && height !== null && sourceWidth && sourceHeight) {
		width = Math.round((sourceWidth / sourceHeight) * height);
	}
	if (height === null && width !== null && sourceWidth && sourceHeight) {
		height = Math.round((sourceHeight / sourceWidth) * width);
	}
	if (width === null && height === null) {
		width = sourceWidth;
		height = sourceHeight;
	}

	if (preset.rotate === 90 || preset.rotate === 270) {
		return { width: height, height: width };
	}

	return { width, height };
};

const getImagePresets = (
	reference: MediaImage | MediaPoster,
	presets: CustomFieldResponseFormatContext["mediaImagePresets"],
): RichTextHydratedImagePreset[] => {
	if (reference.file.meta.mimeType === "image/svg+xml") return [];

	return Object.entries(presets ?? {}).map(([key, preset]) => {
		const dimensions = getPresetDimensions(
			preset,
			reference.file.meta.width,
			reference.file.meta.height,
		);

		return {
			key,
			src: appendPresetQuery(reference.file.url, key),
			mimeType: preset.format
				? presetMimeTypes[preset.format]
				: reference.file.meta.mimeType,
			width: dimensions.width,
			height: dimensions.height,
		};
	});
};

const getImageRenderData = (
	reference: MediaImage | MediaPoster,
	locale: string,
	presets: CustomFieldResponseFormatContext["mediaImagePresets"],
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
		presets: getImagePresets(reference, presets),
	};
};

/** Builds the compact, response-only media payload consumed by HTML rendering. */
export const getMediaRenderData = (
	reference: Media,
	locale: string,
	presets: CustomFieldResponseFormatContext["mediaImagePresets"],
): RichTextHydratedMedia => {
	const title =
		getLocalizedString(reference.title, locale) ||
		reference.file.fileName ||
		reference.file.key;

	if (reference.type === "image") {
		return {
			type: "image",
			...getImageRenderData(reference, locale, presets),
		};
	}
	if (reference.type === "video") {
		return {
			type: "video",
			src: reference.file.url,
			title,
			mimeType: reference.file.meta.mimeType,
			poster: reference.poster
				? getImageRenderData(reference.poster, locale, presets)
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
