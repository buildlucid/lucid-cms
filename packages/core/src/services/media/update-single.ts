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
	const Media = Repository.get("media", context.db, context.config.db);
	const MediaAwaitingSync = Repository.get(
		"media-awaiting-sync",
		context.db,
		context.config.db,
	);

	const mediaRes = await Media.selectSingle({
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
		validation: {
			enabled: true,
			defaultError: {
				message: T("media_not_found_message"),
				status: 404,
			},
		},
	});
	if (mediaRes.error) return mediaRes;

	const upsertTranslationsRes =
		await context.services.translation.upsertMultiple(context, {
			keys: {
				title: mediaRes.data.title_translation_key_id,
				alt: mediaRes.data.alt_translation_key_id,
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
			id: mediaRes.data.id,
			previousSize: mediaRes.data.file_size,
			previousKey: mediaRes.data.key,
			updatedKey: data.key,
			fileName: data.fileName,
		},
	);
	if (updateObjectRes.error) return updateObjectRes;

	const [mediaUpdateRes, deleteMediaSyncRes] = await Promise.all([
		Media.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: data.id,
				},
			],
			data: {
				key: updateObjectRes.data.key,
				e_tag: updateObjectRes.data.etag,
				type: updateObjectRes.data.type,
				mime_type: updateObjectRes.data.mimeType,
				file_extension: updateObjectRes.data.extension,
				file_size: updateObjectRes.data.size,
				width: updateObjectRes.data.width,
				height: updateObjectRes.data.height,
				updated_at: new Date().toISOString(),
				blur_hash: updateObjectRes.data.blurHash,
				average_colour: updateObjectRes.data.averageColour,
				is_dark: updateObjectRes.data.isDark,
				is_light: updateObjectRes.data.isLight,
			},
			returning: ["id"],
			validation: {
				enabled: true,
			},
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
	if (deleteMediaSyncRes.error) return deleteMediaSyncRes;
	if (mediaUpdateRes.error) return mediaUpdateRes;

	return {
		error: undefined,
		data: mediaUpdateRes.data.id,
	};
};

export default updateSingle;
