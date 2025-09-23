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
			width?: number | null;
			height?: number | null;
			blurHash?: string | null;
			averageColor?: string | null;
			isDark?: boolean | null;
			isLight?: boolean | null;
			isDeleted?: boolean;
			userId: number;
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

	// TODO: need better solution for partial updates before the bellow early returns when there is no key
	if (data.isDeleted !== undefined) {
		const updateMediaRes = await Media.updateSingle({
			where: [{ key: "id", operator: "=", value: data.id }],
			data: {
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
			},
			validation: {
				enabled: true,
			},
		});
		if (updateMediaRes.error) return updateMediaRes;
	}

	// early return if no key
	if (data.key !== undefined && data.fileName === undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
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
				width: data.width,
				height: data.height,
				updated_at: new Date().toISOString(),
				blur_hash: data.blurHash,
				average_color: data.averageColor,
				is_dark: data.isDark,
				is_light: data.isLight,
				updated_by: data.userId,
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
