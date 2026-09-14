import constants from "../../constants/constants.js";
import type { LucidMedia } from "../../libs/db/tables/index.js";
import type { Update } from "../../libs/db/types.js";
import formatter from "../../libs/formatters/index.js";
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
import changeKeyVisibility from "../../utils/media/change-key-visibility.js";
import getKeyVisibility from "../../utils/media/get-key-visibility.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkFolderAccess from "../media-folders/checks/check-folder-access.js";
import clearProcessedImage from "../processed-images/clear-single.js";
import checkAwaitingSync from "./checks/check-awaiting-sync.js";
import clearContentMediaSingleCache from "./helpers/clear-content-media-cache.js";
import deactivateCrop from "./helpers/deactivate-crop.js";
import permanentlyDeleteMedia from "./helpers/permanently-delete-media.js";
import prepareMediaTranslations from "./helpers/prepare-media-translations.js";
import resolveAiGeneration from "./helpers/resolve-ai-generation.js";
import resolvePoster from "./helpers/resolve-poster.js";
import syncOwnedVisibility from "./helpers/sync-owned-visibility.js";
import upsertCrop from "./helpers/upsert-crop.js";
import notifyChange from "./notify-change.js";
import renameMedia from "./strategies/rename.js";
import updateMedia from "./strategies/update.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			key?: string;
			fileName?: string;
			folderId?: number | null;
			public?: boolean;
			isHidden?: boolean;
			isDeleted?: boolean;
			origin?: MediaOrigin;
			aiGenerationRequestId?: string;
			title?: { localeCode: string | null; value: string | null }[];
			alt?: { localeCode: string | null; value: string | null }[];
			description?: { localeCode: string | null; value: string | null }[];
			summary?: { localeCode: string | null; value: string | null }[];
			width?: number | null;
			height?: number | null;
			duration?: number | null;
			focalPoint?: { x: number; y: number } | null;
			blurHash?: string | null;
			averageColor?: string | null;
			base64?: string | null;
			isDark?: boolean | null;
			isLight?: boolean | null;
			posterId?: number | null;
			crop?: MediaCropInput | null;
			expectedSize?: number;
			validation?: { maxBytes?: number; mimeTypes?: readonly string[] };
			allowedType?: MediaType;
			userId: number | null;
		},
	],
	number
> = async (context, data) => {
	const Media = new MediaRepository(context.db);
	const MediaTranslations = new MediaTranslationsRepository(context.db);
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(context.db);

	const folderAccessRes = await checkFolderAccess(context, {
		folderId: data.folderId,
	});
	if (folderAccessRes.error) return folderAccessRes;

	const mediaRes = await Media.selectSingleById({
		id: data.id,
		includeOwned: true,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.media.not.found.message"),
				status: 404,
			},
		},
	});
	if (mediaRes.error) return mediaRes;

	if (mediaRes.data.relation_type === "crop") {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.media.not.found.message"),
			},
			data: undefined,
		};
	}
	if (data.crop && mediaRes.data.type !== "image") {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.errors.image.only"),
			},
			data: undefined,
		};
	}

	if (data.focalPoint !== undefined && mediaRes.data.type !== "image") {
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

	if (data.posterId !== undefined && data.posterId !== null) {
		const posterRes = await resolvePoster(context, {
			posterId: data.posterId,
			parentId: data.id,
		});
		if (posterRes.error) return posterRes;
	}

	if (data.key !== undefined && data.fileName === undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					file: {
						code: "media_error",
						message: copy("server:core.media.errors.missing.file.name"),
					},
				},
			},
			data: undefined,
		};
	}

	let updateObjectRes: Awaited<ReturnType<typeof updateMedia>>["data"];

	let renamedKey: string | undefined;
	const currentPublic = formatter.formatBoolean(mediaRes.data.public);
	const targetPublic = data.public ?? currentPublic;

	if (data.key !== undefined && data.fileName !== undefined) {
		const awaitingSync = await checkAwaitingSync(context, {
			key: data.key,
		});
		if (awaitingSync.error) return awaitingSync;

		const updateRes = await updateMedia(context, {
			previousSize: mediaRes.data.file_size,
			previousKey: mediaRes.data.key,
			previousType: mediaRes.data.type,
			previousEtag: mediaRes.data.e_tag,
			updatedKey: data.key,
			allowedType: data.allowedType,
			expectedSize: data.expectedSize,
			validation: data.validation,
			fileName: data.fileName,
			targetKey:
				targetPublic === currentPublic
					? mediaRes.data.key
					: changeKeyVisibility({
							key: mediaRes.data.key,
							visibility: targetPublic
								? constants.media.visibilityKeys.public
								: constants.media.visibilityKeys.private,
						}),
		});
		if (updateRes.error) return updateRes;

		updateObjectRes = updateRes.data;
	}

	const finalType = updateObjectRes?.type ?? mediaRes.data.type;
	const hasDimensions = finalType === "image" || finalType === "video";
	const hasDuration = finalType === "video" || finalType === "audio";

	const adoption = await MediaTranslations.adoptUnassigned({
		localeCode: context.config.localization.defaultLocale,
		mediaId: data.id,
	});
	if (adoption.error) return adoption;

	const translations = prepareMediaTranslations({
		defaultLocale: context.config.localization.defaultLocale,
		title: data.title || [],
		alt: finalType === "image" ? (data.alt ?? []) : [],
		description:
			finalType === "video" || finalType === "audio"
				? (data.description ?? [])
				: [],
		summary: finalType === "document" ? (data.summary ?? []) : [],
		mediaId: mediaRes.data.id,
	});

	if (data.posterId != null && finalType !== "video") {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.poster.video.only"),
			},
			data: undefined,
		};
	}
	if (data.focalPoint !== undefined && finalType !== "image") {
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

	//* if no new key/file provided but public flag differs, rename the key only
	if (
		data.key === undefined &&
		data.public !== undefined &&
		currentPublic !== data.public
	) {
		const targetVisibility = data.public
			? constants.media.visibilityKeys.public
			: constants.media.visibilityKeys.private;
		const newKey = changeKeyVisibility({
			key: mediaRes.data.key,
			visibility: targetVisibility,
		});

		const renameRes = await renameMedia(context, {
			from: mediaRes.data.key,
			to: newKey,
		});
		if (renameRes.error) return renameRes;

		renamedKey = newKey;
	}

	//* key visibility infered from either the new key, or if we're changing the visibility, the renamed key
	const keyVisibility = updateObjectRes?.key
		? getKeyVisibility(updateObjectRes.key)
		: renamedKey
			? getKeyVisibility(renamedKey)
			: undefined;

	//* we infer the public value based on the key so there cannot be drift between the media uploaded via the
	//* upload endpoint and this media update endpoint which the SPA calls afterwards
	const isPublic =
		keyVisibility !== undefined
			? keyVisibility === constants.media.visibilityKeys.public
			: undefined;

	//* clear processed images if:
	//* - a new file was uploaded (variants of old image are invalid)
	//* - visibility changed (variants need to be in new public/private path)
	const activeCrop = mediaRes.data.crop?.[0];

	const shouldClearProcessed =
		mediaRes.data.type === "image" &&
		(updateObjectRes !== undefined ||
			renamedKey !== undefined ||
			(data.focalPoint !== undefined && activeCrop === undefined));
	const shouldClearActiveCropProcessed =
		activeCrop !== undefined &&
		data.focalPoint !== undefined &&
		data.crop === undefined &&
		updateObjectRes === undefined;

	const aiGenerationRes = await resolveAiGeneration(context, {
		origin: data.origin,
		aiGenerationRequestId: data.aiGenerationRequestId,
	});
	if (aiGenerationRes.error) return aiGenerationRes;

	const focalPoint = updateObjectRes
		? (data.focalPoint ?? null)
		: data.focalPoint;
	const preserveOriginalFocalPoint =
		activeCrop !== undefined && updateObjectRes === undefined;

	const updateData: Partial<Update<LucidMedia>> = {
		key: updateObjectRes?.key ?? renamedKey,
		e_tag: updateObjectRes?.etag,
		status: updateObjectRes?.status,
		storage_adapter_key: updateObjectRes?.storageAdapterKey,
		storage_adapter_reference: updateObjectRes?.storageAdapterReference,
		storage_adapter_data: updateObjectRes?.storageAdapterData,
		origin: data.origin,
		ai_generation_id: aiGenerationRes.data,
		type: updateObjectRes?.type,
		mime_type: updateObjectRes?.mimeType,
		file_extension: updateObjectRes?.extension,
		file_name: data.fileName,
		file_size: updateObjectRes?.size,
		width: !hasDimensions
			? null
			: updateObjectRes
				? (updateObjectRes.width ?? data.width ?? null)
				: data.width,
		height: !hasDimensions
			? null
			: updateObjectRes
				? (updateObjectRes.height ?? data.height ?? null)
				: data.height,
		duration: !hasDuration
			? null
			: updateObjectRes
				? (updateObjectRes.duration ?? data.duration ?? null)
				: data.duration,
		focal_x:
			finalType !== "image"
				? null
				: preserveOriginalFocalPoint || focalPoint === undefined
					? undefined
					: focalPoint === null
						? null
						: Math.round(focalPoint.x * 10000),
		focal_y:
			finalType !== "image"
				? null
				: preserveOriginalFocalPoint || focalPoint === undefined
					? undefined
					: focalPoint === null
						? null
						: Math.round(focalPoint.y * 10000),
		blur_hash: updateObjectRes ? (data.blurHash ?? null) : data.blurHash,
		average_color: updateObjectRes
			? (data.averageColor ?? null)
			: data.averageColor,
		base64:
			finalType !== "image"
				? null
				: updateObjectRes
					? (data.base64 ?? null)
					: data.base64,
		is_dark: updateObjectRes ? (data.isDark ?? null) : data.isDark,
		is_light: updateObjectRes ? (data.isLight ?? null) : data.isLight,
		folder_id: data.folderId,
		public: isPublic ?? data.public,
		is_hidden: mediaRes.data.parent_media_id == null ? data.isHidden : true,
		is_deleted: data.isDeleted,
		is_deleted_at: data.isDeleted
			? new Date().toISOString()
			: data.isDeleted === false
				? null
				: undefined,
		deleted_by: data.isDeleted
			? data.userId
			: data.isDeleted === false
				? null
				: undefined,
		updated_at: new Date().toISOString(),
		updated_by: data.userId,
	};

	const [
		mediaUpdateRes,
		mediaTranslationsRes,
		clearProcessedRes,
		clearActiveCropProcessedRes,
		cropFocalRes,
	] = await Promise.all([
		Media.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: data.id,
				},
			],
			data: updateData,
			returning: ["id"],
			validation: {
				enabled: true,
			},
		}),
		Promise.all(
			translations.map((translation) =>
				MediaTranslations.upsertSingle({
					data: translation,
					returning: ["id"],
					validation: { enabled: true },
				}),
			),
		),
		shouldClearProcessed
			? clearProcessedImage(context, {
					id: mediaRes.data.id,
					key: mediaRes.data.key,
				})
			: Promise.resolve({ error: undefined, data: undefined }),
		shouldClearActiveCropProcessed
			? clearProcessedImage(context, {
					key: activeCrop.key,
				})
			: Promise.resolve({ error: undefined, data: undefined }),
		shouldClearActiveCropProcessed
			? Media.updateSingle({
					where: [{ key: "id", operator: "=", value: activeCrop.id }],
					data: {
						focal_x:
							data.focalPoint === null
								? null
								: Math.round((data.focalPoint?.x ?? 0) * 10000),
						focal_y:
							data.focalPoint === null
								? null
								: Math.round((data.focalPoint?.y ?? 0) * 10000),
						updated_at: new Date().toISOString(),
						updated_by: data.userId,
					},
					returning: ["id"],
				})
			: Promise.resolve({ error: undefined, data: undefined }),
	]);
	if (mediaUpdateRes.error) return mediaUpdateRes;
	const failedTranslation = mediaTranslationsRes.find((result) => result.error);
	if (failedTranslation?.error) return failedTranslation;
	if (clearProcessedRes.error) return clearProcessedRes;
	if (clearActiveCropProcessedRes.error) return clearActiveCropProcessedRes;
	if (cropFocalRes.error) return cropFocalRes;

	const currentPosterId = mediaRes.data.poster?.[0]?.id ?? null;
	const posterWasRemoved =
		data.posterId !== undefined &&
		currentPosterId !== null &&
		data.posterId !== currentPosterId;

	if (posterWasRemoved && currentPosterId !== null) {
		const deletePosterRes = await permanentlyDeleteMedia(context, {
			id: currentPosterId,
			invalidateCache: false,
		});
		if (deletePosterRes.error) return deletePosterRes;
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

	const shouldDeactivateCrop =
		data.crop === null ||
		(updateObjectRes !== undefined && data.crop === undefined);
	if (shouldDeactivateCrop) {
		const deactivateRes = await deactivateCrop(context, {
			parentId: mediaRes.data.id,
			userId: data.userId,
		});
		if (deactivateRes.error) return deactivateRes;
	}

	if (data.crop) {
		const cropRes = await upsertCrop(context, {
			parent: {
				id: mediaRes.data.id,
				key: updateObjectRes?.key ?? renamedKey ?? mediaRes.data.key,
				type: finalType,
				origin: data.origin ?? mediaRes.data.origin,
				public: isPublic ?? data.public ?? mediaRes.data.public,
				relation_type: mediaRes.data.relation_type,
			},
			crop: data.crop,
			userId: data.userId,
		});
		if (cropRes.error) return cropRes;
	}

	const visibilityRes = await syncOwnedVisibility(context, {
		parentId: mediaRes.data.id,
		public: isPublic ?? data.public ?? currentPublic,
		userId: data.userId,
	});
	if (visibilityRes.error) return visibilityRes;

	if (
		updateObjectRes !== undefined &&
		updateObjectRes.sourceDeleted !== false &&
		data.key !== undefined
	) {
		const deleteMediaSyncRes = await MediaAwaitingSync.deleteSingle({
			where: [{ key: "key", operator: "=", value: data.key }],
			returning: ["key"],
			validation: {
				enabled: true,
			},
		});
		if (deleteMediaSyncRes.error) return deleteMediaSyncRes;
	}

	await Promise.all([
		clearContentMediaSingleCache(context, data.id),
		invalidateHttpCacheTags(context, [cacheKeys.http.tags.contentMedia]),
	]);

	const hookRes = await executeHooks(
		context,
		{
			service: "media",
			event: "afterUpdate",
			config: context.config,
		},
		{
			meta: {},
			data: {
				id: mediaUpdateRes.data.id,
				userId: data.userId,
			},
		},
	);
	if (hookRes.error) return hookRes;

	if (data.posterId !== undefined && data.posterId !== null) {
		const changedPoster = await notifyChange(context, {
			ids: [data.posterId],
			change: { type: "updated" },
		});
		if (changedPoster.error) return changedPoster;
	}

	const changed = await notifyChange(context, {
		ids: [data.id],
		change:
			data.isDeleted === undefined ||
			data.isDeleted === formatter.formatBoolean(mediaRes.data.is_deleted)
				? { type: "updated" }
				: data.isDeleted
					? { type: "deleted", permanent: false }
					: { type: "restored" },
	});
	if (changed.error) return changed;

	return {
		error: undefined,
		data: mediaUpdateRes.data.id,
	};
};

export default updateSingle;
