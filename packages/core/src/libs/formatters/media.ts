import type { Config } from "../../types/config.js";
import type {
	Media,
	MediaCropState,
	MediaFile,
	MediaFileMeta,
	MediaImageFile,
	MediaImageMeta,
	MediaImagePreview,
	MediaOrigin,
	MediaPoster,
	MediaStatus,
	MediaTranslationMap,
	MediaType,
	MediaVideoSource,
} from "../../types/response.js";
import { createMediaUrl, resolveDeliveryUrl } from "../../utils/media/index.js";
import type { MediaRef } from "../collection/custom-fields/fields/media/types.js";
import type { BooleanInt } from "../db/types.js";
import type {
	MediaDeliveryAdapterInstance,
	MediaDeliveryFile,
} from "../media-delivery/types.js";
import formatter from "./helpers.js";

type MediaTranslationProps = {
	title?: string | null;
	alt: string | null;
	description?: string | null;
	summary?: string | null;
	locale_code: string | null;
};

export type MediaFormatterOptions = {
	host: string;
	delivery: MediaDeliveryAdapterInstance;
	imagePresets: Config["media"]["images"]["presets"];
};

export interface MediaPosterPropsT {
	id: number;
	key: string;
	status: MediaStatus;
	storage_adapter_key: string;
	storage_adapter_reference: string | null;
	storage_adapter_data: Record<string, unknown> | null;
	public: BooleanInt;
	origin: MediaOrigin;
	type: MediaType;
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
}

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

const formatFileMeta = (media: MediaPosterPropsT): MediaFileMeta => ({
	mimeType: media.mime_type,
	extension: media.file_extension,
	fileSize: media.file_size,
});

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

const toDeliveryFile = (media: MediaPosterPropsT): MediaDeliveryFile => ({
	key: media.key,
	fileName: media.file_name,
	type: media.type,
	mimeType: media.mime_type,
	extension: media.file_extension,
	width: media.width,
	height: media.height,
	focalPoint: formatFocalPoint(media.focal_x, media.focal_y),
	storage: {
		adapterKey: media.storage_adapter_key,
		adapterReference: media.storage_adapter_reference,
		adapterData: media.storage_adapter_data,
	},
});

const createFileUrl = (
	media: MediaPosterPropsT,
	options: MediaFormatterOptions,
) =>
	resolveDeliveryUrl({
		delivery: options.delivery,
		file: toDeliveryFile(media),
		host: options.host,
		public: formatter.formatBoolean(media.public),
	}) ??
	createMediaUrl({
		key: media.key,
		host: options.host,
		fileName: media.file_name,
		extension: media.file_extension,
	});

const formatPresets = (
	media: MediaPosterPropsT,
	options: MediaFormatterOptions,
): MediaImageFile["presets"] => {
	const presets: MediaImageFile["presets"] = {};
	if (media.status !== "ready") return presets;
	const focalPoint =
		formatFocalPoint(media.focal_x, media.focal_y) ?? undefined;

	for (const [name, transformation] of Object.entries(options.imagePresets)) {
		const url = resolveDeliveryUrl({
			delivery: options.delivery,
			file: toDeliveryFile(media),
			host: options.host,
			public: formatter.formatBoolean(media.public),
			preset: name,
			transformation: { ...transformation, focalPoint },
		});
		if (url) presets[name] = { url };
	}

	return presets;
};

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

const formatFileIdentity = (
	media: MediaPosterPropsT,
	options: MediaFormatterOptions,
): Pick<MediaFile, "key" | "url" | "fileName"> => ({
	key: media.key,
	url: createFileUrl(media, options),
	fileName: media.file_name,
});

const formatFile = (
	media: MediaPosterPropsT,
	options: MediaFormatterOptions,
): MediaFile => ({
	...formatFileIdentity(media, options),
	meta: formatFileMeta(media),
});

const formatImageFile = (
	media: MediaPosterPropsT,
	options: MediaFormatterOptions,
): MediaImageFile => {
	const activeCrop = media.crop?.[0];
	if (!activeCrop) {
		return {
			...formatFileIdentity(media, options),
			presets: formatPresets(media, options),
			sourceType: "original",
			meta: formatImageMeta(media),
		};
	}

	return {
		...formatFileIdentity(activeCrop, options),
		presets: formatPresets(activeCrop, options),
		sourceType: "crop",
		crop: formatCropState(activeCrop),
		meta: formatImageMeta(activeCrop),
		original: {
			key: media.key,
			url: createFileUrl(media, options),
			presets: formatPresets(media, options),
			meta: formatImageMeta(media),
		},
	};
};

const translationsFor = (
	media: MediaPosterPropsT,
	field: "title" | "alt" | "description" | "summary",
): MediaTranslationMap => {
	const translations = (media.translations ?? []).reduce<
		Record<string, string | null>
	>((translations, translation) => {
		if (translation.locale_code !== null) {
			translations[translation.locale_code] = translation[field] ?? null;
		}
		return translations;
	}, {});

	return Object.keys(translations).length > 0 ? translations : null;
};

const formatMediaImagePreview = (props: {
	poster?: MediaPosterPropsT | null;
	options: MediaFormatterOptions;
}): MediaImagePreview | null => {
	if (!props.poster) return null;

	return {
		id: props.poster.id,
		type: "image",
		status: props.poster.status,
		origin: props.poster.origin,
		title: translationsFor(props.poster, "title"),
		alt: translationsFor(props.poster, "alt"),
		file: formatImageFile(props.poster, props.options),
	};
};

const formatPoster = (props: {
	poster?: MediaPosterPropsT | null;
	options: MediaFormatterOptions;
}): MediaPoster | null => {
	if (!props.poster) return null;

	return {
		id: props.poster.id,
		type: "image",
		status: props.poster.status,
		origin: props.poster.origin,
		alt: translationsFor(props.poster, "alt"),
		file: formatImageFile(props.poster, props.options),
	};
};

const formatVideoSources = (
	media: MediaPosterPropsT,
	options: MediaFormatterOptions,
	file: MediaFile,
): MediaVideoSource[] => {
	if (media.status !== "ready") return [];

	if (formatter.formatBoolean(media.public)) {
		const externalSources = options.delivery.resolveVideoSources?.({
			host: options.host,
			file: toDeliveryFile(media),
		});
		if (externalSources !== undefined && externalSources !== null) {
			return externalSources;
		}
	}

	return [
		{
			url: file.url,
			mimeType: file.meta.mimeType,
			kind: "progressive",
		},
	];
};

const formatSingle = (props: {
	media: MediaPropsT;
	options: MediaFormatterOptions;
}): Media => {
	const common = {
		status: props.media.status,
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
				file: formatImageFile(props.media, props.options),
				...state,
			};
		case "video": {
			const file = formatFile(props.media, props.options);
			return {
				id: props.media.id,
				type: "video",
				...common,
				description: translationsFor(props.media, "description"),
				file,
				sources: formatVideoSources(props.media, props.options, file),
				poster: formatPoster({
					poster: props.media.poster?.[0],
					options: props.options,
				}),
				...state,
			};
		}
		case "audio":
			return {
				id: props.media.id,
				type: "audio",
				...common,
				description: translationsFor(props.media, "description"),
				file: formatFile(props.media, props.options),
				...state,
			};
		case "document":
			return {
				id: props.media.id,
				type: "document",
				...common,
				summary: translationsFor(props.media, "summary"),
				file: formatFile(props.media, props.options),
				...state,
			};
		case "archive":
			return {
				id: props.media.id,
				type: "archive",
				...common,
				file: formatFile(props.media, props.options),
				...state,
			};
		default:
			return {
				id: props.media.id,
				type: "unknown",
				...common,
				file: formatFile(props.media, props.options),
				...state,
			};
	}
};

const formatMultiple = (props: {
	media: MediaPropsT[];
	options: MediaFormatterOptions;
}): Media[] =>
	props.media.map((media) =>
		formatSingle({
			media,
			options: props.options,
		}),
	);

const formatRef = (props: {
	media?: MediaPropsT | null;
	options: MediaFormatterOptions;
}): MediaRef | null => {
	if (!props.media) return null;
	return formatSingle({
		media: props.media,
		options: props.options,
	});
};

export default {
	formatMultiple,
	formatSingle,
	formatMediaImagePreview,
	formatPoster,
	formatRef,
	formatFocalPoint,
};
