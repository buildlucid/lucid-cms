import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import cacheKeys from "../../libs/kv-adapter/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv-adapter/http-cache.js";
import {
	MediaRepository,
	MediaTranslationsRepository,
	MediaAwaitingSyncRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import getKeyVisibility from "../../utils/media/get-key-visibility.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices, processedImageServices } from "../index.js";
import prepareMediaTranslations from "./helpers/prepare-media-translations.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			key?: string;
			fileName?: string;
			public?: boolean;
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
	const Media = new MediaRepository(context.db, context.config.db);
	const MediaTranslations = new MediaTranslationsRepository(
		context.db,
		context.config.db,
	);
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(
		context.db,
		context.config.db,
	);

	const mediaRes = await Media.selectSingle({
		select: ["id", "key", "file_size", "public", "type"],
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
					file: {
						code: "media_error",
						message: T("media_error_missing_file_name"),
					},
				},
			},
			data: undefined,
		};
	}

	let updateObjectRes: Awaited<
		ReturnType<typeof mediaServices.strategies.update>
	>["data"];

	let renamedKey: string | undefined;

	if (data.key !== undefined && data.fileName !== undefined) {
		const awaitingSync = await mediaServices.checks.checkAwaitingSync(context, {
			key: data.key,
		});
		if (awaitingSync.error) return awaitingSync;

		const updateRes = await mediaServices.strategies.update(context, {
			id: mediaRes.data.id,
			previousSize: mediaRes.data.file_size,
			previousKey: mediaRes.data.key,
			updatedKey: data.key,
			fileName: data.fileName,
		});
		if (updateRes.error) return updateRes;

		updateObjectRes = updateRes.data;
	}

	//* if no new key/file provided but public flag differs, rename the key only
	if (
		data.key === undefined &&
		data.fileName === undefined &&
		data.public !== undefined
	) {
		const currentPublic = formatter.formatBoolean(mediaRes.data.public);
		if (currentPublic !== data.public) {
			const targetVisibility = data.public
				? constants.media.visibilityKeys.public
				: constants.media.visibilityKeys.private;
			const { default: changeKeyVisibility } = await import(
				"../../utils/media/change-key-visibility.js"
			);
			const newKey = changeKeyVisibility({
				key: mediaRes.data.key,
				visibility: targetVisibility,
			});

			const renameRes = await mediaServices.strategies.rename(context, {
				from: mediaRes.data.key,
				to: newKey,
			});
			if (renameRes.error) return renameRes;

			renamedKey = newKey;
		}
	}

	//* key visibility infered from either the new key, or if we're changing the visibility, the renamed key
	const keyVisibility = updateObjectRes?.key
		? getKeyVisibility(updateObjectRes.key)
		: renamedKey
			? getKeyVisibility(renamedKey)
			: undefined;

	//* we infer the public value based on the key so there cannot be drift between the media uploaded via the
	//* upload endpoint and this media update endpoint which the SPA calls afterwards
	const isPublic =
		keyVisibility !== undefined
			? keyVisibility === constants.media.visibilityKeys.public
			: undefined;

	//* clear processed images if:
	//* - a new file was uploaded (variants of old image are invalid)
	//* - visibility changed (variants need to be in new public/private path)
	const shouldClearProcessed =
		(updateObjectRes !== undefined || renamedKey !== undefined) &&
		mediaRes.data.type === "image";

	const [
		mediaUpdateRes,
		deleteMediaSyncRes,
		mediaTranslationsRes,
		clearProcessedRes,
	] = await Promise.all([
		Media.updateSingle({
			where: [{ key: "id", operator: "=", value: data.id }],
			data: {
				key: updateObjectRes?.key ?? renamedKey,
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
				public: isPublic ?? data.public,
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
		shouldClearProcessed
			? processedImageServices.clearSingle(context, {
					id: mediaRes.data.id,
				})
			: Promise.resolve({ error: undefined, data: undefined }),
	]);
	if (deleteMediaSyncRes.error) return deleteMediaSyncRes;
	if (mediaUpdateRes.error) return mediaUpdateRes;
	if (mediaTranslationsRes.error) return mediaTranslationsRes;
	if (clearProcessedRes.error) return clearProcessedRes;

	await Promise.all([
		context.kv.command.delete(cacheKeys.http.static.clientMediaSingle(data.id)),
		invalidateHttpCacheTags(context.kv, [cacheKeys.http.tags.clientMedia]),
	]);

	return {
		error: undefined,
		data: mediaUpdateRes.data.id,
	};
};

export default updateSingle;
