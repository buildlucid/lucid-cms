import constants from "../../constants/constants.js";
import { mediaFormatter } from "../../libs/formatters/index.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import cacheKeys from "../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv/http-cache.js";
import {
	MediaAwaitingSyncRepository,
	MediaRepository,
	MediaTranslationsRepository,
} from "../../libs/repositories/index.js";
import type {
	MediaCropInput,
	MediaOrigin,
	MediaType,
} from "../../types/response.js";
import type { Media } from "../../types.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import getKeyVisibility from "../../utils/media/get-key-visibility.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkFolderAccess from "../media-folders/checks/check-folder-access.js";
import checkAwaitingSync from "./checks/check-awaiting-sync.js";
import prepareMediaTranslations from "./helpers/prepare-media-translations.js";
import resolveAiGeneration from "./helpers/resolve-ai-generation.js";
import resolvePoster from "./helpers/resolve-poster.js";
import syncOwnedVisibility from "./helpers/sync-owned-visibility.js";
import upsertCrop from "./helpers/upsert-crop.js";
import deleteMediaObject from "./strategies/delete.js";
import syncMedia from "./strategies/sync-media.js";

const createSingle: ServiceFn<
	[
		{
			key: string;
			fileName: string;
			width?: number;
			height?: number;
			duration?: number | null;
			focalPoint?: {
				x: number;
				y: number;
			};
			blurHash?: string;
			averageColor?: string;
			base64?: string | null;
			isDark?: boolean;
			isLight?: boolean;
			title?: {
				localeCode: string;
				value: string | null;
			}[];
			alt?: {
				localeCode: string;
				value: string | null;
			}[];
			description?: {
				localeCode: string;
				value: string | null;
			}[];
			summary?: {
				localeCode: string;
				value: string | null;
			}[];
			folderId?: number | null;
			isHidden?: boolean;
			posterId?: number | null;
			crop?: MediaCropInput;
			origin: MediaOrigin;
			aiGenerationRequestId?: string;
			allowedType?: MediaType;
			userId: number;
		},
	],
	Media
> = async (context, data) => {
	const Media = new MediaRepository(context.db);
	const MediaTranslations = new MediaTranslationsRepository(context.db);
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(context.db);

	const folderAccessRes = await checkFolderAccess(context, {
		folderId: data.folderId,
	});
	if (folderAccessRes.error) return folderAccessRes;

	const awaitingSyncRes = await checkAwaitingSync(context, {
		key: data.key,
	});
	if (awaitingSyncRes.error) return awaitingSyncRes;

	const syncMediaRes = await syncMedia(context, {
		key: data.key,
		fileName: data.fileName,
		allowedType: data.allowedType,
	});
	if (syncMediaRes.error) return syncMediaRes;
	const mediaKey = syncMediaRes.data.key;

	if (data.focalPoint !== undefined && syncMediaRes.data.type !== "image") {
		await deleteMediaObject(context, {
			key: mediaKey,
			size: syncMediaRes.data.size,
			processedSize: 0,
		});
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					focalPoint: {
						code: "media_error",
						message: copy("server:core.media.errors.focal.point.image.only"),
					},
				},
			},
			data: undefined,
		};
	}
	if (data.crop !== undefined && syncMediaRes.data.type !== "image") {
		await deleteMediaObject(context, {
			key: mediaKey,
			size: syncMediaRes.data.size,
			processedSize: 0,
		});
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.errors.image.only"),
			},
			data: undefined,
		};
	}

	const keyVisibility = getKeyVisibility(mediaKey);

	//* we infer the public value based on the key so there cannot be drift between the media uploaded via the
	//* upload endpoint and this media update endpoint which the SPA calls afterwards
	const isPublic = keyVisibility === constants.media.visibilityKeys.public;

	if (data.posterId != null && syncMediaRes.data.type !== "video") {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.poster.video.only"),
			},
			data: undefined,
		};
	}

	//* verify the poster exists
	if (data.posterId !== undefined && data.posterId !== null) {
		const posterRes = await resolvePoster(context, {
			posterId: data.posterId,
		});
		if (posterRes.error) return posterRes;
	}

	const aiGenerationRes = await resolveAiGeneration(context, {
		origin: data.origin,
		aiGenerationRequestId: data.aiGenerationRequestId,
	});
	if (aiGenerationRes.error) return aiGenerationRes;
	const isImage = syncMediaRes.data.type === "image";
	const hasDimensions = isImage || syncMediaRes.data.type === "video";
	const hasDuration =
		syncMediaRes.data.type === "video" || syncMediaRes.data.type === "audio";

	const [mediaRes, deleteMediaSyncRes] = await Promise.all([
		Media.createSingle({
			data: {
				key: mediaKey,
				status: syncMediaRes.data.status,
				storage_adapter_key: syncMediaRes.data.storageAdapterKey,
				storage_adapter_reference: syncMediaRes.data.storageAdapterReference,
				storage_adapter_data: syncMediaRes.data.storageAdapterData,
				parent_media_id: null,
				relation_type: null,
				e_tag: syncMediaRes.data.etag ?? undefined,
				origin: data.origin,
				ai_generation_id: aiGenerationRes.data,
				public: isPublic,
				type: syncMediaRes.data.type,
				mime_type: syncMediaRes.data.mimeType,
				file_extension: syncMediaRes.data.extension,
				file_name: data.fileName,
				file_size: syncMediaRes.data.size,
				width: hasDimensions
					? (syncMediaRes.data.width ?? data.width ?? null)
					: null,
				height: hasDimensions
					? (syncMediaRes.data.height ?? data.height ?? null)
					: null,
				duration: hasDuration
					? (syncMediaRes.data.duration ?? data.duration ?? null)
					: null,
				focal_x:
					syncMediaRes.data.type === "image" && data.focalPoint
						? Math.round(data.focalPoint.x * 10000)
						: null,
				focal_y:
					syncMediaRes.data.type === "image" && data.focalPoint
						? Math.round(data.focalPoint.y * 10000)
						: null,
				blur_hash: isImage ? (data.blurHash ?? null) : null,
				average_color: isImage ? (data.averageColor ?? null) : null,
				base64: isImage ? (data.base64 ?? null) : null,
				is_dark: isImage ? (data.isDark ?? null) : null,
				is_light: isImage ? (data.isLight ?? null) : null,
				folder_id: data.folderId ?? null,
				is_hidden: data.isHidden ?? false,
				created_by: data.userId,
				updated_by: data.userId,
				updated_at: new Date().toISOString(),
				created_at: new Date().toISOString(),
			},
			returning: ["id"],
		}),
		MediaAwaitingSync.deleteSingle({
			where: [
				{
					key: "key",
					operator: "=",
					value: data.key,
				},
			],
			returning: ["key"],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (mediaRes.error) return mediaRes;
	if (deleteMediaSyncRes.error) return deleteMediaSyncRes;

	if (mediaRes.data === undefined) {
		if (context.mediaStorage) {
			await context.mediaStorage.delete(context, {
				key: mediaKey,
			});
		}
		return {
			error: {
				type: "basic",
				status: 500,
			},
			data: undefined,
		};
	}

	if (data.posterId !== undefined && data.posterId !== null) {
		const hidePosterRes = await Media.updateSingle({
			where: [{ key: "id", operator: "=", value: data.posterId }],
			data: {
				is_hidden: true,
				folder_id: null,
				parent_media_id: mediaRes.data.id,
				relation_type: "poster",
				updated_at: new Date().toISOString(),
				updated_by: data.userId,
			},
			validation: {
				enabled: true,
			},
		});
		if (hidePosterRes.error) return hidePosterRes;
	}

	if (data.crop) {
		const cropRes = await upsertCrop(context, {
			parent: {
				id: mediaRes.data.id,
				key: mediaKey,
				type: syncMediaRes.data.type,
				origin: data.origin,
				public: isPublic,
				relation_type: null,
			},
			crop: data.crop,
			userId: data.userId,
		});
		if (cropRes.error) return cropRes;
	}

	const visibilityRes = await syncOwnedVisibility(context, {
		parentId: mediaRes.data.id,
		public: isPublic,
		userId: data.userId,
	});
	if (visibilityRes.error) return visibilityRes;

	const translations = prepareMediaTranslations({
		title: data.title || [],
		alt: isImage ? (data.alt ?? []) : [],
		description:
			syncMediaRes.data.type === "video" || syncMediaRes.data.type === "audio"
				? (data.description ?? [])
				: [],
		summary: syncMediaRes.data.type === "document" ? (data.summary ?? []) : [],
		mediaId: mediaRes.data.id,
	});
	if (translations.length > 0) {
		const mediaTranslationsRes = await MediaTranslations.upsertMultiple({
			data: translations,
			returning: ["id"],
			validation: {
				enabled: true,
			},
		});
		if (mediaTranslationsRes.error) {
			if (context.mediaStorage) {
				await context.mediaStorage.delete(context, {
					key: mediaKey,
				});
			}
			return mediaTranslationsRes;
		}
	}

	await invalidateHttpCacheTags(context, [cacheKeys.http.tags.contentMedia]);

	const mediaFetchRes = await Media.selectSingleById({
		id: mediaRes.data.id,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.media.not.found.message"),
				status: 404,
			},
		},
	});
	if (mediaFetchRes.error) return mediaFetchRes;

	const media = mediaFormatter.formatSingle({
		media: mediaFetchRes.data,
		options: {
			host: getBaseUrl(context),
			delivery: context.mediaDelivery,
		},
	});

	const hookRes = await executeHooks(
		context,
		{
			service: "media",
			event: "afterCreate",
			config: context.config,
		},
		{
			meta: {},
			data: {
				id: mediaFetchRes.data.id,
				userId: data.userId,
				media,
			},
		},
	);
	if (hookRes.error) return hookRes;

	return {
		error: undefined,
		data: media,
	};
};

export default createSingle;
