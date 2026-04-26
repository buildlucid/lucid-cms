import constants from "../../constants/constants.js";
import { mediaFormatter } from "../../libs/formatters/index.js";
import cacheKeys from "../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv/http-cache.js";
import getMediaAdapter from "../../libs/media/get-adapter.js";
import {
	MediaAwaitingSyncRepository,
	MediaRepository,
	MediaTranslationsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { MediaType } from "../../types/response.js";
import type { Media } from "../../types.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import getKeyVisibility from "../../utils/media/get-key-visibility.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";
import prepareMediaTranslations from "./helpers/prepare-media-translations.js";
import resolvePoster from "./helpers/resolve-poster.js";

const createSingle: ServiceFn<
	[
		{
			key: string;
			fileName: string;
			width?: number;
			height?: number;
			blurHash?: string;
			averageColor?: string;
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

	const keyVisibility = getKeyVisibility(syncMediaRes.data.key);

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

	const [mediaRes, deleteMediaSyncRes, mediaAdapter] = await Promise.all([
		Media.createSingle({
			data: {
				key: syncMediaRes.data.key,
				poster_id: data.posterId ?? null,
				e_tag: syncMediaRes.data.etag ?? undefined,
				public: isPublic,
				type: syncMediaRes.data.type,
				mime_type: syncMediaRes.data.mimeType,
				file_extension: syncMediaRes.data.extension,
				file_name: data.fileName,
				file_size: syncMediaRes.data.size,
				width: data.width ?? null,
				height: data.height ?? null,
				blur_hash: data.blurHash ?? null,
				average_color: data.averageColor ?? null,
				is_dark: data.isDark ?? null,
				is_light: data.isLight ?? null,
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
		getMediaAdapter(context.config),
	]);
	if (mediaRes.error) return mediaRes;
	if (deleteMediaSyncRes.error) return deleteMediaSyncRes;

	if (mediaRes.data === undefined) {
		if (mediaAdapter.enabled) {
			await mediaAdapter.adapter.delete(syncMediaRes.data.key);
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
			if (mediaAdapter.enabled) {
				await mediaAdapter.adapter.delete(syncMediaRes.data.key);
			}
			return mediaTranslationsRes;
		}
	}

	await invalidateHttpCacheTags(context.kv, [cacheKeys.http.tags.clientMedia]);

	const mediaFetchRes = await Media.selectSingleById({
		id: mediaRes.data.id,
		validation: {
			enabled: true,
			defaultError: {
				message: T("media_not_found_message"),
				status: 404,
			},
		},
	});
	if (mediaFetchRes.error) return mediaFetchRes;

	return {
		error: undefined,
		data: mediaFormatter.formatSingle({
			media: mediaFetchRes.data,
			host: getBaseUrl(context),
		}),
	};
};

export default createSingle;
