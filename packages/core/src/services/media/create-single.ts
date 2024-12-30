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
	const MediaRepo = Repository.get("media", context.db, context.config.db);
	const MediaAwaitingSyncRepo = Repository.get(
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

	const [mediaRes] = await Promise.all([
		MediaRepo.createSingle({
			key: syncMediaRes.data.key,
			eTag: syncMediaRes.data.etag ?? undefined,
			visible: data.visible ?? true,
			type: syncMediaRes.data.type,
			mimeType: syncMediaRes.data.mimeType,
			extension: syncMediaRes.data.extension,
			fileSize: syncMediaRes.data.size,
			width: syncMediaRes.data.width,
			height: syncMediaRes.data.height,
			titleTranslationKeyId: translationKeyIdsRes.data.title,
			altTranslationKeyId: translationKeyIdsRes.data.alt,
			blurHash: syncMediaRes.data.blurHash,
			averageColour: syncMediaRes.data.averageColour,
			isDark: syncMediaRes.data.isDark,
			isLight: syncMediaRes.data.isLight,
		}),
		MediaAwaitingSyncRepo.deleteSingle({
			where: [
				{
					key: "key",
					operator: "=",
					value: data.key,
				},
			],
		}),
	]);
	if (mediaRes === undefined) {
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
		data: mediaRes.id,
	};
};

export default createSingle;
