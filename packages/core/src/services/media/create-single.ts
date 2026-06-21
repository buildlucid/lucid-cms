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
import type { MediaOrigin, MediaType } from "../../types/response.js";
import type { Media } from "../../types.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import getKeyVisibility from "../../utils/media/get-key-visibility.js";
import { resolveMediaKeyTenant } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";
import checkFolderAccess from "../media-folders/checks/check-folder-access.js";
import checkFolderTenantCompatibility from "./helpers/check-folder-tenant-compatibility.js";
import prepareMediaTranslations from "./helpers/prepare-media-translations.js";
import resolveAiGeneration from "./helpers/resolve-ai-generation.js";
import resolvePoster from "./helpers/resolve-poster.js";

const createSingle: ServiceFn<
	[
		{
			key: string;
			fileName: string;
			width?: number;
			height?: number;
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
			origin: MediaOrigin;
			aiGenerationRequestId?: string;
			allowedType?: MediaType;
			userId: number;
		},
	],
	Media
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

	const mediaTenantKey = context.request.tenantKey ?? null;

	const folderTenantRes = checkFolderTenantCompatibility({
		folderId: data.folderId,
		folderTenantKey: folderAccessRes.data?.tenant_key ?? null,
		mediaTenantKey,
	});
	if (folderTenantRes.error) return folderTenantRes;

	const keyAccessRes = await mediaServices.checks.checkMediaKeyAccess(context, {
		key: data.key,
	});
	if (keyAccessRes.error) return keyAccessRes;

	const awaitingSyncRes = await mediaServices.checks.checkAwaitingSync(
		context,
		{
			key: data.key,
		},
	);
	if (awaitingSyncRes.error) return awaitingSyncRes;

	const syncMediaRes = await mediaServices.strategies.syncMedia(context, {
		key: data.key,
		fileName: data.fileName,
		allowedType: data.allowedType,
	});
	if (syncMediaRes.error) return syncMediaRes;
	const mediaKey = syncMediaRes.data.key;

	if (data.focalPoint !== undefined && syncMediaRes.data.type !== "image") {
		await mediaServices.strategies.deleteObject(context, {
			key: mediaKey,
			size: syncMediaRes.data.size,
			processedSize: 0,
			tenantKey: mediaTenantKey,
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

	const keyVisibility = getKeyVisibility(mediaKey);

	//* we infer the public value based on the key so there cannot be drift between the media uploaded via the
	//* upload endpoint and this media update endpoint which the SPA calls afterwards
	const isPublic = keyVisibility === constants.media.visibilityKeys.public;

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

	const [mediaRes, deleteMediaSyncRes] = await Promise.all([
		Media.createSingle({
			data: {
				key: mediaKey,
				poster_id: data.posterId ?? null,
				e_tag: syncMediaRes.data.etag ?? undefined,
				origin: data.origin,
				ai_generation_id: aiGenerationRes.data,
				public: isPublic,
				type: syncMediaRes.data.type,
				mime_type: syncMediaRes.data.mimeType,
				file_extension: syncMediaRes.data.extension,
				file_name: data.fileName,
				file_size: syncMediaRes.data.size,
				width: data.width ?? null,
				height: data.height ?? null,
				focal_x:
					syncMediaRes.data.type === "image" && data.focalPoint
						? Math.round(data.focalPoint.x * 10000)
						: null,
				focal_y:
					syncMediaRes.data.type === "image" && data.focalPoint
						? Math.round(data.focalPoint.y * 10000)
						: null,
				blur_hash: data.blurHash ?? null,
				average_color: data.averageColor ?? null,
				base64:
					syncMediaRes.data.type === "image" ? (data.base64 ?? null) : null,
				is_dark: data.isDark ?? null,
				is_light: data.isLight ?? null,
				folder_id: data.folderId ?? null,
				is_hidden: data.isHidden ?? false,
				tenant_key: mediaTenantKey,
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
		if (context.media) {
			await context.media.delete(context, {
				key: mediaKey,
				tenant: resolveMediaKeyTenant(context.config, mediaKey),
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
				updated_at: new Date().toISOString(),
				updated_by: data.userId,
			},
			validation: {
				enabled: true,
			},
		});
		if (hidePosterRes.error) return hidePosterRes;
	}

	const translations = prepareMediaTranslations({
		title: data.title || [],
		alt: data.alt || [],
		description: data.description || [],
		summary: data.summary || [],
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
			if (context.media) {
				await context.media.delete(context, {
					key: mediaKey,
					tenant: resolveMediaKeyTenant(context.config, mediaKey),
				});
			}
			return mediaTranslationsRes;
		}
	}

	await invalidateHttpCacheTags(context, [cacheKeys.http.tags.clientMedia]);

	const mediaFetchRes = await Media.selectSingleById({
		id: mediaRes.data.id,
		tenantKey: context.request.tenantKey,
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
		host: getBaseUrl(context),
	});

	const hookRes = await executeHooks(
		context,
		{
			service: "media",
			event: "afterCreate",
			config: context.config,
		},
		{
			meta: {
				tenantKey: context.request.tenantKey ?? null,
			},
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
