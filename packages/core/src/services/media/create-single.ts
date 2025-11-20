import constants from "../../constants/constants.js";
import cacheKeys from "../../libs/kv-adapter/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv-adapter/http-cache.js";
import getMediaAdapter from "../../libs/media-adapter/get-adapter.js";
import {
	MediaRepository,
	MediaTranslationsRepository,
	MediaAwaitingSyncRepository,
} from "../../libs/repositories/index.js";
import getKeyVisibility from "../../utils/media/get-key-visibility.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";
import prepareMediaTranslations from "./helpers/prepare-media-translations.js";

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
			folderId?: number | null;
			userId: number;
		},
	],
	number
> = async (context, data) => {
	const Media = new MediaRepository(context.db, context.config.db);
	const MediaTranslations = new MediaTranslationsRepository(
		context.db,
		context.config.db,
	);
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(
		context.db,
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
	});
	if (syncMediaRes.error) return syncMediaRes;

	const keyVisibility = getKeyVisibility(syncMediaRes.data.key);

	//* we infer the public value based on the key so there cannot be drift between the media uploaded via the
	//* upload endpoint and this media update endpoint which the SPA calls afterwards
	const isPublic = keyVisibility === constants.media.visibilityKeys.public;

	const [mediaRes, deleteMediaSyncRes, mediaAdapter] = await Promise.all([
		Media.createSingle({
			data: {
				key: syncMediaRes.data.key,
				e_tag: syncMediaRes.data.etag ?? undefined,
				public: isPublic,
				type: syncMediaRes.data.type,
				mime_type: syncMediaRes.data.mimeType,
				file_extension: syncMediaRes.data.extension,
				file_size: syncMediaRes.data.size,
				width: data.width ?? null,
				height: data.height ?? null,
				blur_hash: data.blurHash ?? null,
				average_color: data.averageColor ?? null,
				is_dark: data.isDark ?? null,
				is_light: data.isLight ?? null,
				folder_id: data.folderId ?? null,
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
			await mediaAdapter.adapter.services.delete(syncMediaRes.data.key);
		}
		return {
			error: {
				type: "basic",
				status: 500,
			},
			data: undefined,
		};
	}

	const translations = prepareMediaTranslations({
		title: data.title || [],
		alt: data.alt || [],
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
				await mediaAdapter.adapter.services.delete(syncMediaRes.data.key);
			}
			return mediaTranslationsRes;
		}
	}

	await invalidateHttpCacheTags(context.kv, [cacheKeys.http.tags.clientMedia]);

	return {
		error: undefined,
		data: mediaRes.data.id,
	};
};

export default createSingle;
