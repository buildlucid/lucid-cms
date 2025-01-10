import {
	mergeTranslationGroups,
	getUniqueLocaleCodes,
} from "../../utils/translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createSingle: ServiceFn<
	[
		{
			key: string;
			fileName: string;
			title?: {
				localeCode: string;
				value: string | null;
			}[];
			alt?: {
				localeCode: string;
				value: string | null;
			}[];
			visible?: boolean;
		},
	],
	number
> = async (context, data) => {
	const Media = Repository.get("media", context.db, context.config.db);
	const MediaAwaitingSync = Repository.get(
		"media-awaiting-sync",
		context.db,
		context.config.db,
	);

	const [localeExistsRes, awaitingSyncRes] = await Promise.all([
		context.services.locale.checks.checkLocalesExist(context, {
			localeCodes: getUniqueLocaleCodes([data.title || [], data.alt || []]),
		}),
		context.services.media.checks.checkAwaitingSync(context, {
			key: data.key,
		}),
	]);
	if (localeExistsRes.error) return localeExistsRes;
	if (awaitingSyncRes.error) return awaitingSyncRes;

	const translationKeyIdsRes =
		await context.services.translation.createMultiple(context, {
			keys: ["title", "alt"],
			translations: mergeTranslationGroups([
				{
					translations: data.title || [],
					key: "title",
				},
				{
					translations: data.alt || [],
					key: "alt",
				},
			]),
		});
	if (translationKeyIdsRes.error) return translationKeyIdsRes;

	const syncMediaRes = await context.services.media.strategies.syncMedia(
		context,
		{
			key: data.key,
			fileName: data.fileName,
		},
	);
	if (syncMediaRes.error) return syncMediaRes;

	const [mediaRes, deleteMediaSyncRes] = await Promise.all([
		Media.createSingle({
			data: {
				key: syncMediaRes.data.key,
				e_tag: syncMediaRes.data.etag ?? undefined,
				visible: data.visible ?? true,
				type: syncMediaRes.data.type,
				mime_type: syncMediaRes.data.mimeType,
				file_extension: syncMediaRes.data.extension,
				file_size: syncMediaRes.data.size,
				width: syncMediaRes.data.width,
				height: syncMediaRes.data.height,
				title_translation_key_id: translationKeyIdsRes.data.title,
				alt_translation_key_id: translationKeyIdsRes.data.alt,
				blur_hash: syncMediaRes.data.blurHash,
				average_colour: syncMediaRes.data.averageColour,
				is_dark: syncMediaRes.data.isDark,
				is_light: syncMediaRes.data.isLight,
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

	return {
		error: undefined,
		data: mediaRes.data.id,
	};
};

export default createSingle;
