import type {
	Media,
	MediaAdapterData,
	MediaCropState,
	MediaImageFile,
	MediaImageMeta,
	MediaImagePreview,
	MediaOrigin,
	MediaOriginalFile,
	MediaPoster,
	MediaStatus,
	MediaTranslationMap,
	MediaType,
	MediaVideoFile,
	MediaVideoSource,
	MediaVideoThumbnail,
} from "../../types/response.js";
import {
	mediaAdapterDataSchema,
	resolveDeliveryUrl,
} from "../../utils/media/index.js";
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
};

export interface MediaPosterPropsT {
	id: number;
	key: string;
	status: MediaStatus;
	storage_adapter_key: string;
	storage_adapter_reference: string | null;
	storage_adapter_data: MediaAdapterData | null;
	public: BooleanInt;
	origin: MediaOrigin;
	type: MediaType;
	mime_type: string;
	file_extension: string;
	file_name: string | null;
	file_size: number;
	width: number | null;
	height: number | null;
	duration?: number | null;
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

const toDeliveryFile = (media: MediaPosterPropsT): MediaDeliveryFile => ({
	key: media.key,
	fileName: media.file_name,
	type: media.type,
	mimeType: media.mime_type,
	extension: media.file_extension,
	width: media.width,
	height: media.height,
	duration: media.duration ?? null,
	focalPoint: formatFocalPoint(media.focal_x, media.focal_y),
	storage: {
		adapterKey: media.storage_adapter_key,
		adapterReference: media.storage_adapter_reference,
		adapterData: media.storage_adapter_data,
	},
});

const formatFile = (
	media: MediaPosterPropsT,
	options: MediaFormatterOptions,
) => {
	const file = toDeliveryFile(media);
	const isPublic = formatter.formatBoolean(media.public);
	const url = resolveDeliveryUrl({
		delivery: options.delivery,
		file,
		host: options.host,
		public: isPublic,
	});
	const deliveryData =
		isPublic && options.delivery.resolveResponseData
			? mediaAdapterDataSchema
					.nullable()
					.parse(
						options.delivery.resolveResponseData({ host: options.host, file }),
					)
			: null;

	return {
		key: media.key,
		fileName: media.file_name,
		url,
		meta: {
			mimeType: media.mime_type,
			extension: media.file_extension,
			fileSize: media.file_size,
		},
		delivery: {
			adapter: options.delivery.key,
			data: deliveryData,
			supportsPresetQuery:
				media.type === "image" &&
				media.status === "ready" &&
				Boolean(options.delivery.processImage) &&
				(!isPublic ||
					options.delivery.resolveFile({
						host: options.host,
						file,
					}).type !== "external"),
		},
	};
};
const formatCropState = (media: MediaPosterPropsT): MediaCropState => {
	const {
		crop_x: x,
		crop_y: y,
		crop_width: width,
		crop_height: height,
		crop_rotation: rotation,
		crop_skew_x: skewX,
		crop_skew_y: skewY,
	} = media;

	if (
		typeof x !== "number" ||
		typeof y !== "number" ||
		typeof width !== "number" ||
		typeof height !== "number" ||
		typeof rotation !== "number" ||
		typeof skewX !== "number" ||
		typeof skewY !== "number"
	) {
		throw new TypeError("Active crop media has incomplete crop state");
	}

	return { x, y, width, height, rotation, skewX, skewY };
};

const formatImageFile = (
	media: MediaPosterPropsT,
	options: MediaFormatterOptions,
): MediaImageFile => {
	const formatSource = (source: MediaPosterPropsT) => {
		const file = formatFile(source, options);

		return {
			...file,
			meta: {
				...file.meta,
				width: source.width,
				height: source.height,
				focalPoint: formatFocalPoint(source.focal_x, source.focal_y),
				blurHash: source.blur_hash,
				averageColor: source.average_color,
				base64: source.type === "image" ? (source.base64 ?? null) : null,
				isDark: formatter.formatBoolean(source.is_dark),
				isLight: formatter.formatBoolean(source.is_light),
			},
		};
	};

	const original = {
		sourceType: "original",
		...formatSource(media),
	} satisfies MediaOriginalFile;
	const activeCrop = media.crop?.[0];
	if (!activeCrop) return original;

	return {
		sourceType: "crop",
		...formatSource(activeCrop),
		crop: formatCropState(activeCrop),
		original,
	};
};

const translationsFor = (
	media: MediaPosterPropsT,
	field: "title" | "alt" | "description" | "summary",
): MediaTranslationMap => {
	const translations = (media.translations ?? []).reduce<
		Record<string, string | null>
	>((result, translation) => {
		if (translation.locale_code !== null) {
			result[translation.locale_code] = translation[field] ?? null;
		}
		return result;
	}, {});

	return Object.keys(translations).length > 0 ? translations : null;
};

const formatMediaImagePreview = (props: {
	poster?: MediaPosterPropsT | null;
	options: MediaFormatterOptions;
}): MediaImagePreview | null => {
	if (!props.poster) return null;
	const image = formatImageFile(props.poster, props.options);
	const title = translationsFor(props.poster, "title");
	const alt = translationsFor(props.poster, "alt");

	if (image.sourceType === "original") {
		return {
			id: props.poster.id,
			type: "image",
			status: props.poster.status,
			sourceType: image.sourceType,
			origin: props.poster.origin,
			title,
			alt,
			key: image.key,
			fileName: image.fileName,
			url: image.url,
			meta: image.meta,
			delivery: image.delivery,
		};
	}

	return {
		id: props.poster.id,
		type: "image",
		status: props.poster.status,
		sourceType: image.sourceType,
		origin: props.poster.origin,
		title,
		alt,
		key: image.key,
		fileName: image.fileName,
		url: image.url,
		meta: image.meta,
		delivery: image.delivery,
		crop: image.crop,
		original: image.original,
	};
};

const formatPoster = (props: {
	poster?: MediaPosterPropsT | null;
	options: MediaFormatterOptions;
}): MediaPoster | null => {
	if (!props.poster) return null;
	const image = formatImageFile(props.poster, props.options);
	const alt = translationsFor(props.poster, "alt");

	if (image.sourceType === "original") {
		return {
			id: props.poster.id,
			type: "image",
			status: props.poster.status,
			sourceType: image.sourceType,
			origin: props.poster.origin,
			alt,
			key: image.key,
			fileName: image.fileName,
			url: image.url,
			meta: image.meta,
			delivery: image.delivery,
		};
	}

	return {
		id: props.poster.id,
		type: "image",
		status: props.poster.status,
		sourceType: image.sourceType,
		origin: props.poster.origin,
		alt,
		key: image.key,
		fileName: image.fileName,
		url: image.url,
		meta: image.meta,
		delivery: image.delivery,
		crop: image.crop,
		original: image.original,
	};
};

const formatVideoFile = (
	media: MediaPosterPropsT,
	options: MediaFormatterOptions,
): MediaVideoFile => {
	const file = formatFile(media, options);
	let sources: MediaVideoSource[] = [];
	let thumbnail: MediaVideoThumbnail | null = null;

	if (media.status === "ready" && formatter.formatBoolean(media.public)) {
		const resolvedVideo = options.delivery.resolveVideo?.({
			host: options.host,
			file: toDeliveryFile(media),
		});
		if (resolvedVideo) {
			sources = resolvedVideo.sources;
			thumbnail = resolvedVideo.thumbnail
				? {
						url: resolvedVideo.thumbnail.url,
						mimeType: resolvedVideo.thumbnail.mimeType,
						width: resolvedVideo.thumbnail.width ?? null,
						height: resolvedVideo.thumbnail.height ?? null,
					}
				: null;
		}
	}

	if (media.status === "ready" && sources.length === 0) {
		sources = [
			{
				url: file.url,
				mimeType: file.meta.mimeType,
				kind: "progressive",
			},
		];
	}

	return {
		...file,
		meta: {
			...file.meta,
			width: media.width,
			height: media.height,
			duration: media.duration ?? null,
		},
		sources,
		thumbnail,
	};
};

const formatSingle = (props: {
	media: MediaPropsT;
	options: MediaFormatterOptions;
}): Media => {
	const details = {
		folderId: props.media.folder_id,
		origin: props.media.origin,
		public: formatter.formatBoolean(props.media.public),
		title: translationsFor(props.media, "title"),
	};
	const lifecycle = {
		isDeleted: formatter.formatBoolean(props.media.is_deleted),
		isDeletedAt: formatter.formatDate(props.media.is_deleted_at),
		deletedBy: props.media.deleted_by,
		createdAt: formatter.formatDate(props.media.created_at),
		updatedAt: formatter.formatDate(props.media.updated_at),
	};

	switch (props.media.type) {
		case "image": {
			const image = formatImageFile(props.media, props.options);
			const alt = translationsFor(props.media, "alt");

			if (image.sourceType === "original") {
				return {
					id: props.media.id,
					type: "image",
					status: props.media.status,
					sourceType: image.sourceType,
					...details,
					alt,
					key: image.key,
					fileName: image.fileName,
					url: image.url,
					meta: image.meta,
					delivery: image.delivery,
					...lifecycle,
				};
			}

			return {
				id: props.media.id,
				type: "image",
				status: props.media.status,
				sourceType: image.sourceType,
				...details,
				alt,
				key: image.key,
				fileName: image.fileName,
				url: image.url,
				meta: image.meta,
				delivery: image.delivery,
				crop: image.crop,
				original: image.original,
				...lifecycle,
			};
		}
		case "video": {
			const file = formatVideoFile(props.media, props.options);
			return {
				id: props.media.id,
				type: "video",
				status: props.media.status,
				...details,
				description: translationsFor(props.media, "description"),
				...file,
				poster: formatPoster({
					poster: props.media.poster?.[0],
					options: props.options,
				}),
				...lifecycle,
			};
		}
		case "audio": {
			const file = formatFile(props.media, props.options);
			return {
				id: props.media.id,
				type: "audio",
				status: props.media.status,
				...details,
				description: translationsFor(props.media, "description"),
				key: file.key,
				fileName: file.fileName,
				url: file.url,
				meta: {
					...file.meta,
					duration: props.media.duration ?? null,
				},
				delivery: file.delivery,
				...lifecycle,
			};
		}
		case "document":
			return {
				id: props.media.id,
				type: "document",
				status: props.media.status,
				...details,
				summary: translationsFor(props.media, "summary"),
				...formatFile(props.media, props.options),
				...lifecycle,
			};
		case "archive":
			return {
				id: props.media.id,
				type: "archive",
				status: props.media.status,
				...details,
				...formatFile(props.media, props.options),
				...lifecycle,
			};
		case "unknown":
			return {
				id: props.media.id,
				type: "unknown",
				status: props.media.status,
				...details,
				...formatFile(props.media, props.options),
				...lifecycle,
			};
		default:
			props.media.type satisfies never;
			throw new TypeError(`Unsupported media type: ${props.media.type}`);
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
