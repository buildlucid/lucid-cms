import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			key?: string;
			fileName?: string;
			title?: {
				localeCode: string;
				value: string | null;
			}[];
			alt?: {
				localeCode: string;
				value: string | null;
			}[];
		},
	],
	number | undefined
> = async (context, data) => {
	const MediaRepo = Repository.get("media", context.db, context.config.db);
	const MediaAwaitingSyncRepo = Repository.get(
		"media-awaiting-sync",
		context.db,
		context.config.db,
	);

	const media = await MediaRepo.selectSingle({
		select: [
			"id",
			"key",
			"file_size",
			"title_translation_key_id",
			"alt_translation_key_id",
		],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (media === undefined) {
		return {
			error: {
				type: "basic",
				message: T("media_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const upsertTranslationsRes =
		await context.services.translation.upsertMultiple(context, {
			keys: {
				title: media.title_translation_key_id,
				alt: media.alt_translation_key_id,
			},
			items: [
				{
					translations: data.title || [],
					key: "title",
				},
				{
					translations: data.alt || [],
					key: "alt",
				},
			],
		});
	if (upsertTranslationsRes.error) return upsertTranslationsRes;

	// early return if no key
	if (data.key !== undefined && data.fileName === undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				errorResponse: {
					body: {
						file: {
							code: "media_error",
							message: T("media_error_missing_file_name"),
						},
					},
				},
			},
			data: undefined,
		};
	}

	if (data.key === undefined || data.fileName === undefined) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	// check if media is awaiting sync
	const awaitingSync = await context.services.media.checks.checkAwaitingSync(
		context,
		{
			key: data.key,
		},
	);
	if (awaitingSync.error) return awaitingSync;

	const updateObjectRes = await context.services.media.strategies.update(
		context,
		{
			id: media.id,
			previousSize: media.file_size,
			previousKey: media.key,
			updatedKey: data.key,
			fileName: data.fileName,
		},
	);
	if (updateObjectRes.error) return updateObjectRes;

	const [mediaUpdateRes] = await Promise.all([
		MediaRepo.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: data.id,
				},
			],
			data: {
				key: updateObjectRes.data.key,
				eTag: updateObjectRes.data.etag,
				type: updateObjectRes.data.type,
				mimeType: updateObjectRes.data.mimeType,
				extension: updateObjectRes.data.extension,
				fileSize: updateObjectRes.data.size,
				width: updateObjectRes.data.width,
				height: updateObjectRes.data.height,
				updatedAt: new Date().toISOString(),
				blurHash: updateObjectRes.data.blurHash,
				averageColour: updateObjectRes.data.averageColour,
				isDark: updateObjectRes.data.isDark,
				isLight: updateObjectRes.data.isLight,
			},
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
	if (mediaUpdateRes === undefined) {
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
		data: mediaUpdateRes.id,
	};
};

export default updateSingle;
