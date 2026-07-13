import constants from "../../constants/constants.js";
import type { LucidMedia, Update } from "../../libs/db/types.js";
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
import { mediaServices, processedImageServices } from "../index.js";
import checkFolderAccess from "../media-folders/checks/check-folder-access.js";
import checkFolderTenantCompatibility from "./helpers/check-folder-tenant-compatibility.js";
import clearClientMediaSingleCache from "./helpers/clear-client-media-cache.js";
import deactivateCrop from "./helpers/deactivate-crop.js";
import permanentlyDeleteMedia from "./helpers/permanently-delete-media.js";
import prepareMediaTranslations from "./helpers/prepare-media-translations.js";
import resolveAiGeneration from "./helpers/resolve-ai-generation.js";
import resolvePoster from "./helpers/resolve-poster.js";
import syncOwnedVisibility from "./helpers/sync-owned-visibility.js";
import upsertCrop from "./helpers/upsert-crop.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			key?: string;
			fileName?: string;
			public?: boolean;
			folderId?: number | null;
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
			width?: number | null;
			height?: number | null;
			focalPoint?: {
				x: number;
				y: number;
			} | null;
			blurHash?: string | null;
			averageColor?: string | null;
			base64?: string | null;
			isDark?: boolean | null;
			isLight?: boolean | null;
			isDeleted?: boolean;
			posterId?: number | null;
			crop?: MediaCropInput | null;
			origin?: MediaOrigin;
			aiGenerationRequestId?: string;
			allowedType?: MediaType;
			userId: number;
		},
	],
	number | undefined
> = async (context, data) => {
	const Media = new MediaRepository(context.db.client, context.config.db);
	const MediaTranslations = new MediaTranslationsRepository(
		context.db.client,
		context.config.db,
	);
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(
		context.db.client,
		context.config.db,
	);

	const folderAccessRes = await checkFolderAccess(context, {
		folderId: data.folderId,
	});
	if (folderAccessRes.error) return folderAccessRes;

	const mediaRes = await Media.selectSingleById({
		id: data.id,
		tenantKey: context.request.tenantKey,
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

	const folderTenantRes = checkFolderTenantCompatibility({
		folderId: data.folderId,
		folderTenantKey: folderAccessRes.data?.tenant_key ?? null,
		mediaTenantKey: mediaRes.data.tenant_key,
	});
	if (folderTenantRes.error) return folderTenantRes;

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

	const translations = prepareMediaTranslations({
		title: data.title || [],
		alt: data.alt || [],
		description: data.description || [],
		summary: data.summary || [],
		mediaId: mediaRes.data.id,
	});

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

	let updateObjectRes: Awaited<
		ReturnType<typeof mediaServices.strategies.update>
	>["data"];

	let renamedKey: string | undefined;
	const currentPublic = formatter.formatBoolean(mediaRes.data.public);
	const targetPublic = data.public ?? currentPublic;

	if (data.key !== undefined && data.fileName !== undefined) {
		const keyAccessRes = await mediaServices.checks.checkMediaKeyAccess(
			context,
			{
				key: data.key,
			},
		);
		if (keyAccessRes.error) return keyAccessRes;

		const awaitingSync = await mediaServices.checks.checkAwaitingSync(context, {
			key: data.key,
		});
		if (awaitingSync.error) return awaitingSync;

		const updateRes = await mediaServices.strategies.update(context, {
			previousSize: mediaRes.data.file_size,
			previousKey: mediaRes.data.key,
			tenantKey: mediaRes.data.tenant_key,
			previousType: mediaRes.data.type as MediaType,
			previousEtag: mediaRes.data.e_tag,
			updatedKey: data.key,
			allowedType: data.allowedType,
			fileName: data.fileName,
			//* The final media key remains the existing media key, so replacement uploads cannot reassign tenants.
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

		const renameRes = await mediaServices.strategies.rename(context, {
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

	const updateData: Partial<Update<LucidMedia>> = {
		key: updateObjectRes?.key ?? renamedKey,
		e_tag: updateObjectRes?.etag,
		origin: data.origin,
		ai_generation_id: aiGenerationRes.data,
		type: updateObjectRes?.type,
		mime_type: updateObjectRes?.mimeType,
		file_extension: updateObjectRes?.extension,
		file_name: data.fileName,
		file_size: updateObjectRes?.size,
		width: data.width,
		height: data.height,
		focal_x:
			finalType !== "image"
				? null
				: activeCrop !== undefined && updateObjectRes === undefined
					? undefined
					: data.focalPoint === undefined
						? undefined
						: data.focalPoint === null
							? null
							: Math.round(data.focalPoint.x * 10000),
		focal_y:
			finalType !== "image"
				? null
				: activeCrop !== undefined && updateObjectRes === undefined
					? undefined
					: data.focalPoint === undefined
						? undefined
						: data.focalPoint === null
							? null
							: Math.round(data.focalPoint.y * 10000),
		blur_hash: data.blurHash,
		average_color: data.averageColor,
		base64: finalType !== "image" ? null : data.base64,
		is_dark: data.isDark,
		is_light: data.isLight,
		folder_id: data.folderId,
		public: isPublic ?? data.public,
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
		translations.length > 0
			? MediaTranslations.upsertMultiple({
					data: translations,
					returning: ["id"],
					validation: {
						enabled: true,
					},
				})
			: Promise.resolve({ error: undefined, data: undefined }),
		shouldClearProcessed
			? processedImageServices.clearSingle(context, {
					id: mediaRes.data.id,
					key: mediaRes.data.key,
				})
			: Promise.resolve({ error: undefined, data: undefined }),
		shouldClearActiveCropProcessed
			? processedImageServices.clearSingle(context, {
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
	if (mediaTranslationsRes.error) return mediaTranslationsRes;
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
				tenant_key: mediaRes.data.tenant_key,
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
		clearClientMediaSingleCache(context, data.id),
		invalidateHttpCacheTags(context, [cacheKeys.http.tags.clientMedia]),
	]);

	const hookRes = await executeHooks(
		context,
		{
			service: "media",
			event: "afterUpdate",
			config: context.config,
		},
		{
			meta: {
				tenantKey: context.request.tenantKey ?? null,
			},
			data: {
				id: mediaUpdateRes.data.id,
				userId: data.userId,
			},
		},
	);
	if (hookRes.error) return hookRes;

	return {
		error: undefined,
		data: mediaUpdateRes.data.id,
	};
};

export default updateSingle;
