import type { BooleanInt } from "../../libs/db/types.js";
import type {
	Media,
	MediaEmbed,
	MediaOrigin,
	MediaPoster,
	MediaType,
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
): Media["meta"]["focalPoint"] => {
	if (x === null || y === null || x === undefined || y === undefined) {
		return null;
	}

	return {
		x: x / 10000,
		y: y / 10000,
	};
};

/** Formats stored media metadata for the public response contract. */
const formatMeta = (media: MediaPosterPropsT) => ({
	mimeType: media.mime_type,
	extension: media.file_extension,
	fileSize: media.file_size,
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
const formatCropState = (
	media: MediaPosterPropsT,
): NonNullable<Media["crop"]> => {
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

/** Resolves the active crop presentation while retaining original source details. */
const formatActiveSource = (media: MediaPosterPropsT, host: string) => {
	const activeCrop = media.crop?.[0];
	const active = activeCrop ?? media;
	const isCropped = activeCrop !== undefined;

	return {
		active,
		sourceType: isCropped ? ("crop" as const) : ("original" as const),
		original: isCropped
			? {
					key: media.key,
					url: createFileUrl(media, host),
					meta: formatMeta(media),
				}
			: undefined,
		crop: activeCrop ? formatCropState(activeCrop) : undefined,
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

/** Formats embedded media, including poster sources, with active crop resolution. */
const formatEmbed = (props: {
	poster?: MediaPosterPropsT | null;
	host: string;
}): MediaEmbed | null => {
	if (!props.poster) return null;

	const source = formatActiveSource(props.poster, props.host);

	return {
		id: props.poster.id,
		key: source.active.key,
		url: createFileUrl(source.active, props.host),
		fileName: source.active.file_name,
		sourceType: source.sourceType,
		original: source.original,
		crop: source.crop,
		origin: props.poster.origin,
		type: props.poster.type as MediaType,
		title: translationsFor(props.poster, "title"),
		alt: translationsFor(props.poster, "alt"),
		description: translationsFor(props.poster, "description"),
		summary: translationsFor(props.poster, "summary"),
		meta: formatMeta(source.active),
	};
};

/** Formats an owned video poster using the embedded media contract. */
const formatPoster = (props: {
	poster?: MediaPosterPropsT | null;
	host: string;
}): MediaPoster | null => formatEmbed(props);

const formatSingle = (props: { media: MediaPropsT; host: string }): Media => {
	const source = formatActiveSource(props.media, props.host);
	const formatted: Media = {
		id: props.media.id,
		key: source.active.key,
		url: createFileUrl(source.active, props.host),
		fileName: source.active.file_name,
		sourceType: source.sourceType,
		original: source.original,
		crop: source.crop,
		folderId: props.media.folder_id,
		origin: props.media.origin,
		title: translationsFor(props.media, "title"),
		alt: translationsFor(props.media, "alt"),
		description: translationsFor(props.media, "description"),
		summary: translationsFor(props.media, "summary"),
		type: props.media.type as MediaType,
		meta: formatMeta(source.active),
		public: formatter.formatBoolean(props.media.public),
		isDeleted: formatter.formatBoolean(props.media.is_deleted),
		isDeletedAt: formatter.formatDate(props.media.is_deleted_at),
		deletedBy: props.media.deleted_by,
		createdAt: formatter.formatDate(props.media.created_at),
		updatedAt: formatter.formatDate(props.media.updated_at),
	};

	if (props.media.poster !== undefined) {
		formatted.poster = formatPoster({
			poster: props.media.poster[0],
			host: props.host,
		});
	}

	return formatted;
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
	formatEmbed,
	formatPoster,
	formatRef,
	formatFocalPoint,
	objectifyTranslations,
};
