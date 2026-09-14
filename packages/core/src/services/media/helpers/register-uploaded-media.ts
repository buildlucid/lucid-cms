import constants from "../../../constants/constants.js";
import type { Media } from "../../../exports/types.js";
import { mediaFormatter } from "../../../libs/formatters/index.js";
import executeHooks from "../../../libs/hooks/execute-hooks.js";
import { copy } from "../../../libs/i18n/index.js";
import cacheKeys from "../../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTags } from "../../../libs/kv/http-cache.js";
import {
	MediaAwaitingSyncRepository,
	MediaRepository,
	MediaTranslationsRepository,
} from "../../../libs/repositories/index.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import getKeyVisibility from "../../../utils/media/get-key-visibility.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type createSingle from "../create-single.js";
import notifyChange from "../notify-change.js";
import type syncMedia from "../strategies/sync-media.js";
import prepareMediaTranslations from "./prepare-media-translations.js";
import resolveAiGeneration from "./resolve-ai-generation.js";
import resolvePoster from "./resolve-poster.js";
import syncOwnedVisibility from "./sync-owned-visibility.js";
import upsertCrop from "./upsert-crop.js";

/** Registers validated file metadata and runs the media creation hooks. */
const registerUploadedMedia: ServiceFn<
	[
		Parameters<typeof createSingle>[1],
		NonNullable<Awaited<ReturnType<typeof syncMedia>>["data"]>,
	],
	Media
> = async (context, data, uploaded) => {
	const Media = new MediaRepository(context.db);
	const MediaTranslations = new MediaTranslationsRepository(context.db);
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(context.db);
	const mediaKey = uploaded.key;

	if (data.focalPoint !== undefined && uploaded.type !== "image") {
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
	if (data.crop !== undefined && uploaded.type !== "image") {
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

	if (data.posterId != null && uploaded.type !== "video") {
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

	const isImage = uploaded.type === "image";
	const hasDimensions = isImage || uploaded.type === "video";
	const hasDuration = uploaded.type === "video" || uploaded.type === "audio";

	const mediaRes = await Media.createSingle({
		data: {
			key: mediaKey,
			status: uploaded.status,
			storage_adapter_key: uploaded.storageAdapterKey,
			storage_adapter_reference: uploaded.storageAdapterReference,
			storage_adapter_data: uploaded.storageAdapterData,
			parent_media_id: null,
			relation_type: null,
			e_tag: uploaded.etag ?? undefined,
			origin: data.origin,
			ai_generation_id: aiGenerationRes.data,
			public: isPublic,
			type: uploaded.type,
			mime_type: uploaded.mimeType,
			file_extension: uploaded.extension,
			file_name: data.fileName,
			file_size: uploaded.size,
			width: hasDimensions ? (uploaded.width ?? data.width ?? null) : null,
			height: hasDimensions ? (uploaded.height ?? data.height ?? null) : null,
			duration: hasDuration
				? (uploaded.duration ?? data.duration ?? null)
				: null,
			focal_x:
				uploaded.type === "image" && data.focalPoint
					? Math.round(data.focalPoint.x * 10000)
					: null,
			focal_y:
				uploaded.type === "image" && data.focalPoint
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
	});
	if (mediaRes.error) return mediaRes;

	if (mediaRes.data === undefined) {
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
				type: uploaded.type,
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
		defaultLocale: context.config.localization.defaultLocale,
		title: data.title || [],
		alt: isImage ? (data.alt ?? []) : [],
		description:
			uploaded.type === "video" || uploaded.type === "audio"
				? (data.description ?? [])
				: [],
		summary: uploaded.type === "document" ? (data.summary ?? []) : [],
		mediaId: mediaRes.data.id,
	});
	if (translations.length > 0) {
		const translationResults = await Promise.all(
			translations.map((translation) =>
				MediaTranslations.upsertSingle({
					data: translation,
					returning: ["id"],
					validation: { enabled: true },
				}),
			),
		);
		const mediaTranslationsRes = translationResults.find(
			(result) => result.error,
		);
		if (mediaTranslationsRes?.error) {
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
			defaultLocale: context.config.localization.defaultLocale,
			locales: context.config.localization.locales,
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

	const cleared = await MediaAwaitingSync.deleteSingle({
		where: [{ key: "key", operator: "=", value: data.key }],
	});
	if (cleared.error) return cleared;

	if (data.posterId !== undefined && data.posterId !== null) {
		const changedPoster = await notifyChange(context, {
			ids: [data.posterId],
			change: { type: "updated" },
		});
		if (changedPoster.error) return changedPoster;
	}

	const changed = await notifyChange(context, {
		change: { type: "created" },
		ids: [mediaFetchRes.data.id],
	});
	if (changed.error) return changed;

	return {
		error: undefined,
		data: media,
	};
};

export default registerUploadedMedia;
