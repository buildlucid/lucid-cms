import type { BooleanInt } from "../../libs/db/types.js";
import type {
	Media,
	MediaCropState,
	MediaFile,
	MediaFileMeta,
	MediaImageFile,
	MediaImageMeta,
	MediaOrigin,
	MediaPoster,
	ProfilePicture,
} from "../../types/response.js";
import { createMediaUrl } from "../../utils/media/index.js";
import type { MediaRef } from "../collection/custom-fields/fields/media/types.js";
import formatter from "./index.js";

type MediaTranslationProps = {
	title?: string | null;
	alt: string | null;
	description?: string | null;
	summary?: string | null;
	locale_code: string | null;
};

export interface MediaPosterPropsT {
	id: number;
	key: string;
	origin: MediaOrigin;
	type: string;
	mime_type: string;
	file_extension: string;
	file_name: string | null;
	file_size: number;
	width: number | null;
	height: number | null;
	focal_x?: number | null;
	focal_y?: number | null;
	crop_x?: number | null;
	crop_y?: number | null;
	crop_width?: number | null;
	crop_height?: number | null;
	crop_rotation?: number | null;
	crop_skew_x?: number | null;
	crop_skew_y?: number | null;
	blur_hash: string | null;
	average_color: string | null;
	base64?: string | null;
	is_dark: BooleanInt | null;
	is_light: BooleanInt | null;
	translations?: MediaTranslationProps[];
	crop?: MediaPosterPropsT[];
}

export interface MediaPropsT extends MediaPosterPropsT {
	parent_media_id?: number | null;
	relation_type?: "crop" | "poster" | null;
	e_tag: string | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
	poster?: MediaPosterPropsT[];
	folder_id: number | null;
	is_deleted: BooleanInt;
	is_deleted_at: Date | string | null;
	deleted_by: number | null;
	public: BooleanInt;
}

/** Converts translation rows into a locale-keyed field map. */
export const objectifyTranslations = (
	target: "title" | "alt" | "description" | "summary",
	translations: MediaTranslationProps[],
	locales: Array<string>,
): Record<string, string> => {
	return locales.reduce<Record<string, string>>(
		(acc, locale) => ({
			// biome-ignore lint/performance/noAccumulatingSpread: locale maps are small and this keeps the formatter readable
			...acc,
			[locale ?? ""]:
				translations.find((t) => t.locale_code === locale)?.[target] ?? "",
		}),
		{},
	);
};

export const formatFocalPoint = (
	x: number | null | undefined,
	y: number | null | undefined,
): MediaImageMeta["focalPoint"] => {
	if (x === null || y === null || x === undefined || y === undefined) {
		return null;
	}

	return {
		x: x / 10000,
		y: y / 10000,
	};
};

/** Formats metadata shared by every stored file. */
const formatFileMeta = (media: MediaPosterPropsT): MediaFileMeta => ({
	mimeType: media.mime_type,
	extension: media.file_extension,
	fileSize: media.file_size,
});

/** Formats metadata that is only meaningful for image files. */
const formatImageMeta = (media: MediaPosterPropsT): MediaImageMeta => ({
	...formatFileMeta(media),
	width: media.width,
	height: media.height,
	focalPoint: formatFocalPoint(media.focal_x, media.focal_y),
	blurHash: media.blur_hash,
	averageColor: media.average_color,
	base64: media.type === "image" ? (media.base64 ?? null) : null,
	isDark: formatter.formatBoolean(media.is_dark),
	isLight: formatter.formatBoolean(media.is_light),
});

/** Builds a public URL for a specific stored media row. */
const createFileUrl = (media: MediaPosterPropsT, host: string) =>
	createMediaUrl({
		key: media.key,
		host,
		fileName: media.file_name,
		extension: media.file_extension,
	});

/** Formats and asserts the complete editor state stored on a crop row. */
const formatCropState = (media: MediaPosterPropsT): MediaCropState => {
	const values = [
		media.crop_x,
		media.crop_y,
		media.crop_width,
		media.crop_height,
		media.crop_rotation,
		media.crop_skew_x,
		media.crop_skew_y,
	];
	if (values.some((value) => typeof value !== "number")) {
		throw new TypeError("Active crop media has incomplete crop state");
	}

	return {
		x: media.crop_x as number,
		y: media.crop_y as number,
		width: media.crop_width as number,
		height: media.crop_height as number,
		rotation: media.crop_rotation as number,
		skewX: media.crop_skew_x as number,
		skewY: media.crop_skew_y as number,
	};
};

/** Formats the identifying fields shared by every file response. */
const formatFileIdentity = (
	media: MediaPosterPropsT,
	host: string,
): Pick<MediaFile, "key" | "url" | "fileName"> => ({
	key: media.key,
	url: createFileUrl(media, host),
	fileName: media.file_name,
});

/** Formats a non-image file without image-only presentation state. */
const formatFile = (media: MediaPosterPropsT, host: string): MediaFile => ({
	...formatFileIdentity(media, host),
	meta: formatFileMeta(media),
});

/** Resolves an image's active crop and nests its original source when cropped. */
const formatImageFile = (
	media: MediaPosterPropsT,
	host: string,
): MediaImageFile => {
	const activeCrop = media.crop?.[0];
	if (!activeCrop) {
		return {
			...formatFileIdentity(media, host),
			sourceType: "original",
			meta: formatImageMeta(media),
		};
	}

	return {
		...formatFileIdentity(activeCrop, host),
		sourceType: "crop",
		crop: formatCropState(activeCrop),
		meta: formatImageMeta(activeCrop),
		original: {
			key: media.key,
			url: createFileUrl(media, host),
			meta: formatImageMeta(media),
		},
	};
};

/** Formats one translated field for embedded media responses. */
const translationsFor = (
	media: MediaPosterPropsT,
	field: "title" | "alt" | "description" | "summary",
) =>
	media.translations?.map((translation) => ({
		value: translation[field] ?? null,
		localeCode: translation.locale_code,
	})) ?? [];

/** Formats an image used as a user's profile picture. */
const formatProfilePicture = (props: {
	poster?: MediaPosterPropsT | null;
	host: string;
}): ProfilePicture | null => {
	if (!props.poster) return null;

	return {
		id: props.poster.id,
		type: "image",
		origin: props.poster.origin,
		title: translationsFor(props.poster, "title"),
		alt: translationsFor(props.poster, "alt"),
		file: formatImageFile(props.poster, props.host),
	};
};

/** Formats an owned video poster with image-only fields. */
const formatPoster = (props: {
	poster?: MediaPosterPropsT | null;
	host: string;
}): MediaPoster | null => {
	if (!props.poster) return null;

	return {
		id: props.poster.id,
		type: "image",
		origin: props.poster.origin,
		alt: translationsFor(props.poster, "alt"),
		file: formatImageFile(props.poster, props.host),
	};
};

const formatSingle = (props: { media: MediaPropsT; host: string }): Media => {
	const common = {
		folderId: props.media.folder_id,
		origin: props.media.origin,
		title: translationsFor(props.media, "title"),
	};
	const state = {
		public: formatter.formatBoolean(props.media.public),
		isDeleted: formatter.formatBoolean(props.media.is_deleted),
		isDeletedAt: formatter.formatDate(props.media.is_deleted_at),
		deletedBy: props.media.deleted_by,
		createdAt: formatter.formatDate(props.media.created_at),
		updatedAt: formatter.formatDate(props.media.updated_at),
	};

	switch (props.media.type) {
		case "image":
			return {
				id: props.media.id,
				type: "image",
				...common,
				alt: translationsFor(props.media, "alt"),
				file: formatImageFile(props.media, props.host),
				...state,
			};
		case "video":
			return {
				id: props.media.id,
				type: "video",
				...common,
				description: translationsFor(props.media, "description"),
				file: formatFile(props.media, props.host),
				poster: formatPoster({
					poster: props.media.poster?.[0],
					host: props.host,
				}),
				...state,
			};
		case "audio":
			return {
				id: props.media.id,
				type: "audio",
				...common,
				description: translationsFor(props.media, "description"),
				file: formatFile(props.media, props.host),
				...state,
			};
		case "document":
			return {
				id: props.media.id,
				type: "document",
				...common,
				summary: translationsFor(props.media, "summary"),
				file: formatFile(props.media, props.host),
				...state,
			};
		case "archive":
			return {
				id: props.media.id,
				type: "archive",
				...common,
				file: formatFile(props.media, props.host),
				...state,
			};
		default:
			return {
				id: props.media.id,
				type: "unknown",
				...common,
				file: formatFile(props.media, props.host),
				...state,
			};
	}
};

/** Formats a collection of media rows. */
const formatMultiple = (props: { media: MediaPropsT[]; host: string }) =>
	props.media.map((media) => formatSingle({ media, host: props.host }));

const formatRef = (props: {
	media?: MediaPropsT | null;
	host: string;
	locales: string[];
}): MediaRef | null => {
	if (!props.media) return null;
	return formatSingle({ media: props.media, host: props.host });
};

export default {
	formatMultiple,
	formatSingle,
	formatProfilePicture,
	formatPoster,
	formatRef,
	formatFocalPoint,
	objectifyTranslations,
};
