import { copy } from "../../../libs/i18n/index.js";
import cacheKeys from "../../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTags } from "../../../libs/kv/http-cache.js";
import {
	MediaRepository,
	ProcessedImagesRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";
import deleteMediaObject from "../strategies/delete.js";
import clearContentMediaSingleCache from "./clear-content-media-cache.js";

/** Permanently deletes owned descendants before their parent and stored objects. */
const permanentlyDeleteMedia: ServiceFn<
	[
		{
			id: number;
			invalidateCache?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const Media = new MediaRepository(context.db);
	const ProcessedImages = new ProcessedImagesRepository(context.db);

	const getMediaRes = await Media.selectSingleById({
		id: data.id,
		includeOwned: true,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.media.not.found.message"),
				status: 404,
			},
		},
	});
	if (getMediaRes.error) return getMediaRes;

	const childrenRes = await Media.selectMultiple({
		select: ["id"],
		where: [
			{ key: "parent_media_id", operator: "=", value: getMediaRes.data.id },
		],
		validation: { enabled: true },
	});
	if (childrenRes.error) return childrenRes;

	const childDeleteResults = await Promise.all(
		childrenRes.data.map((child) =>
			permanentlyDeleteMedia(context, {
				id: child.id,
				invalidateCache: false,
			}),
		),
	);
	const failedChildDelete = childDeleteResults.find((result) => result.error);
	if (failedChildDelete) return failedChildDelete;

	const processedImagesRes = await ProcessedImages.selectMultiple({
		select: ["key", "file_size"],
		where: [{ key: "media_key", operator: "=", value: getMediaRes.data.key }],
		validation: { enabled: true },
	});
	if (processedImagesRes.error) return processedImagesRes;

	const processedDelete = await mediaStorageRes.data.deleteMultiple(context, {
		keys: processedImagesRes.data.map((image) => image.key),
	});
	if (processedDelete.error) return processedDelete;

	const deletedObject = await deleteMediaObject(context, {
		key: getMediaRes.data.key,
		size: getMediaRes.data.file_size,
		processedSize: processedImagesRes.data.reduce(
			(sum, image) => sum + image.file_size,
			0,
		),
	});
	if (deletedObject.error) return deletedObject;

	const deletedMedia = await Media.deleteSingle({
		where: [{ key: "id", operator: "=", value: data.id }],
		validation: { enabled: true },
	});
	if (deletedMedia.error) return deletedMedia;

	if (data.invalidateCache !== false) {
		await Promise.all([
			clearContentMediaSingleCache(context, data.id),
			invalidateHttpCacheTags(context, [cacheKeys.http.tags.contentMedia]),
		]);
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default permanentlyDeleteMedia;
