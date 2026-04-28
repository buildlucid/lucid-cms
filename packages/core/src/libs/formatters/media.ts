import type { BooleanInt } from "../../libs/db/types.js";
import type {
	Media,
	MediaEmbed,
	MediaPoster,
	MediaType,
} from "../../types/response.js";
import { createMediaUrl } from "../../utils/media/index.js";
import type { MediaRef } from "../collection/custom-fields/fields/media/types.js";
import formatter from "./index.js";

export interface MediaPropsT {
	id: number;
	key: string;
	poster_id?: number | null;
	e_tag: string | null;
	type: string;
	mime_type: string;
	file_extension: string;
	file_name: string | null;
	file_size: number;
	width: number | null;
	height: number | null;
	focal_x?: number | null;
	focal_y?: number | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
	blur_hash: string | null;
	average_color: string | null;
	base64?: string | null;
	is_dark: BooleanInt | null;
	is_light: BooleanInt | null;
	translations?: Array<{
		title: string | null;
		alt: string | null;
		description?: string | null;
		summary?: string | null;
		locale_code: string | null;
	}>;
	poster?: MediaPosterPropsT[];
	folder_id: number | null;
	is_deleted: BooleanInt;
	is_deleted_at: Date | string | null;
	deleted_by: number | null;
	public: BooleanInt;
}

export interface MediaPosterPropsT {
	id: number;
	key: string;
	type: string;
	mime_type: string;
	file_extension: string;
	file_name: string | null;
	file_size: number;
	width: number | null;
	height: number | null;
	focal_x?: number | null;
	focal_y?: number | null;
	blur_hash: string | null;
	average_color: string | null;
	base64?: string | null;
	is_dark: BooleanInt | null;
	is_light: BooleanInt | null;
	translations?: Array<{
		title?: string | null;
		alt: string | null;
		description?: string | null;
		summary?: string | null;
		locale_code: string | null;
	}>;
}

const objectifyTranslations = (
	target: "title" | "alt" | "description" | "summary",
	translations: {
		title: string | null;
		alt: string | null;
		description?: string | null;
		summary?: string | null;
		locale_code: string | null;
	}[],
	locales: Array<string>,
): Record<string, string> => {
	return locales.reduce<Record<string, string>>(
		(acc, locale) => ({
			// biome-ignore lint/performance/noAccumulatingSpread: explanation
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
	if (x === null || y === null || x === undefined || y === undefined)
		return null;

	return {
		x: x / 10000,
		y: y / 10000,
	};
};

const formatMultiple = (props: { media: MediaPropsT[]; host: string }) => {
	return props.media.map((m) =>
		formatSingle({
			media: m,
			host: props.host,
		}),
	);
};

const formatSingle = (props: { media: MediaPropsT; host: string }): Media => {
	const formatted: Media = {
		id: props.media.id,
		key: props.media.key,
		fileName: props.media.file_name,
		folderId: props.media.folder_id,
		url: createMediaUrl({
			key: props.media.key,
			host: props.host,
			fileName: props.media.file_name,
			extension: props.media.file_extension,
		}),
		title:
			props.media.translations?.map((t) => ({
				value: t.title,
				localeCode: t.locale_code,
			})) ?? [],
		alt:
			props.media.translations?.map((t) => ({
				value: t.alt,
				localeCode: t.locale_code,
			})) ?? [],
		description:
			props.media.translations?.map((t) => ({
				value: t.description ?? null,
				localeCode: t.locale_code,
			})) ?? [],
		summary:
			props.media.translations?.map((t) => ({
				value: t.summary ?? null,
				localeCode: t.locale_code,
			})) ?? [],
		type: props.media.type as MediaType,
		meta: {
			mimeType: props.media.mime_type,
			extension: props.media.file_extension,
			fileSize: props.media.file_size,
			width: props.media.width,
			height: props.media.height,
			focalPoint: formatFocalPoint(props.media.focal_x, props.media.focal_y),
			blurHash: props.media.blur_hash,
			averageColor: props.media.average_color,
			base64:
				props.media.type === "image" ? (props.media.base64 ?? null) : null,
			isDark: formatter.formatBoolean(props.media.is_dark),
			isLight: formatter.formatBoolean(props.media.is_light),
		},
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

const formatPoster = (props: {
	poster?: MediaPosterPropsT | null;
	host: string;
}): MediaPoster | null => {
	return formatEmbed(props);
};

const formatEmbed = (props: {
	poster?: MediaPosterPropsT | null;
	host: string;
}): MediaEmbed | null => {
	if (!props.poster) return null;

	return {
		id: props.poster.id,
		key: props.poster.key,
		url: createMediaUrl({
			key: props.poster.key,
			host: props.host,
			fileName: props.poster.file_name,
			extension: props.poster.file_extension,
		}),
		fileName: props.poster.file_name,
		type: props.poster.type as MediaType,
		title:
			props.poster.translations?.map((t) => ({
				value: t.title ?? null,
				localeCode: t.locale_code,
			})) ?? [],
		alt:
			props.poster.translations?.map((t) => ({
				value: t.alt,
				localeCode: t.locale_code,
			})) ?? [],
		description:
			props.poster.translations?.map((t) => ({
				value: t.description ?? null,
				localeCode: t.locale_code,
			})) ?? [],
		summary:
			props.poster.translations?.map((t) => ({
				value: t.summary ?? null,
				localeCode: t.locale_code,
			})) ?? [],
		meta: {
			mimeType: props.poster.mime_type,
			extension: props.poster.file_extension,
			fileSize: props.poster.file_size,
			width: props.poster.width,
			height: props.poster.height,
			focalPoint: formatFocalPoint(props.poster.focal_x, props.poster.focal_y),
			blurHash: props.poster.blur_hash,
			averageColor: props.poster.average_color,
			base64:
				props.poster.type === "image" ? (props.poster.base64 ?? null) : null,
			isDark: formatter.formatBoolean(props.poster.is_dark),
			isLight: formatter.formatBoolean(props.poster.is_light),
		},
	};
};

const formatRef = (props: {
	media?: MediaPropsT | null;
	host: string;
	locales: string[];
}): MediaRef | null => {
	if (!props.media) return null;

	return formatSingle({
		media: props.media,
		host: props.host,
	});
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
