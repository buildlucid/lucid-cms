import Repository from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import services from "../index.js";
import prepareMediaTranslations from "./helpers/prepare-media-translations.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			key?: string;
			fileName?: string;
			folderId?: number | null;
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

	const mediaRes = await Media.selectSingle({
		select: ["id", "key", "file_size"],
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

	const translations = prepareMediaTranslations({
		title: data.title || [],
		alt: data.alt || [],
		mediaId: mediaRes.data.id,
	});

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

	let updateObjectRes: Awaited<
		ReturnType<typeof services.media.strategies.update>
	>["data"];

	if (data.key !== undefined && data.fileName !== undefined) {
		const awaitingSync = await services.media.checks.checkAwaitingSync(
			context,
			{
				key: data.key,
			},
		);
		if (awaitingSync.error) return awaitingSync;

		const updateRes = await services.media.strategies.update(context, {
			id: mediaRes.data.id,
			previousSize: mediaRes.data.file_size,
			previousKey: mediaRes.data.key,
			updatedKey: data.key,
			fileName: data.fileName,
		});
		if (updateRes.error) return updateRes;

		updateObjectRes = updateRes.data;
	}

	const [mediaUpdateRes, deleteMediaSyncRes, mediaTranslationsRes] =
		await Promise.all([
			Media.updateSingle({
				where: [{ key: "id", operator: "=", value: data.id }],
				data: {
					key: updateObjectRes?.key,
					e_tag: updateObjectRes?.etag,
					type: updateObjectRes?.type,
					mime_type: updateObjectRes?.mimeType,
					file_extension: updateObjectRes?.extension,
					file_size: updateObjectRes?.size,
					width: data.width,
					height: data.height,
					blur_hash: data.blurHash,
					average_color: data.averageColor,
					is_dark: data.isDark,
					is_light: data.isLight,
					folder_id: data.folderId,
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
					updated_at: new Date().toISOString(),
					updated_by: data.userId,
				},
				returning: ["id"],
				validation: {
					enabled: true,
				},
			}),
			updateObjectRes !== undefined
				? MediaAwaitingSync.deleteSingle({
						where: [{ key: "key", operator: "=", value: data.key }],
						returning: ["key"],
						validation: {
							enabled: true,
						},
					})
				: Promise.resolve({ error: undefined, data: undefined }),
			translations.length > 0
				? MediaTranslations.upsertMultiple({
						data: translations,
						returning: ["id"],
						validation: {
							enabled: true,
						},
					})
				: Promise.resolve({ error: undefined, data: undefined }),
		]);
	if (deleteMediaSyncRes.error) return deleteMediaSyncRes;
	if (mediaUpdateRes.error) return mediaUpdateRes;
	if (mediaTranslationsRes.error) return mediaTranslationsRes;

	return {
		error: undefined,
		data: mediaUpdateRes.data.id,
	};
};

export default updateSingle;
