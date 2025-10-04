import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import prepareMediaTranslations from "./helpers/prepare-media-translations.js";
import services from "../index.js";

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
			public?: boolean;
			folderId?: number | null;
			userId: number;
		},
	],
	number
> = async (context, data) => {
	const Media = Repository.get("media", context.db, context.config.db);
	const MediaTranslations = Repository.get(
		"media-translations",
		context.db,
		context.config.db,
	);
	const MediaAwaitingSync = Repository.get(
		"media-awaiting-sync",
		context.db,
		context.config.db,
	);

	const awaitingSyncRes = await services.media.checks.checkAwaitingSync(
		context,
		{
			key: data.key,
		},
	);
	if (awaitingSyncRes.error) return awaitingSyncRes;

	const syncMediaRes = await services.media.strategies.syncMedia(context, {
		key: data.key,
		fileName: data.fileName,
	});
	if (syncMediaRes.error) return syncMediaRes;

	const [mediaRes, deleteMediaSyncRes] = await Promise.all([
		Media.createSingle({
			data: {
				key: syncMediaRes.data.key,
				e_tag: syncMediaRes.data.etag ?? undefined,
				public: data.public ?? true,
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
		await context.config.media?.strategy?.deleteSingle(syncMediaRes.data.key);
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
			await context.config.media?.strategy?.deleteSingle(syncMediaRes.data.key);
			return mediaTranslationsRes;
		}
	}

	return {
		error: undefined,
		data: mediaRes.data.id,
	};
};

export default createSingle;
