import { copy } from "../../../libs/i18n/index.js";
import cacheKeys from "../../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTags } from "../../../libs/kv/http-cache.js";
import {
	MediaRepository,
	ProcessedImagesRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkHasMediaStrategy from "../checks/check-has-media-strategy.js";
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
	const mediaStrategyRes = await checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const Media = new MediaRepository(context.db.client, context.config.db);
	const ProcessedImages = new ProcessedImagesRepository(
		context.db.client,
		context.config.db,
	);

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

	const [processedImagesRes, deleteMediaRes] = await Promise.all([
		ProcessedImages.selectMultiple({
			select: ["key", "file_size"],
			where: [
				{
					key: "media_key",
					operator: "=",
					value: getMediaRes.data.key,
				},
			],
			validation: {
				enabled: true,
			},
		}),
		Media.deleteSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: data.id,
				},
			],
			returning: ["file_size", "id", "key"],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (processedImagesRes.error) return processedImagesRes;
	if (deleteMediaRes.error) return deleteMediaRes;

	const [_, deleteObjectRes] = await Promise.all([
		mediaStrategyRes.data.deleteMultiple(context, {
			keys: processedImagesRes.data.map((i) => i.key),
		}),
		deleteMediaObject(context, {
			key: deleteMediaRes.data.key,
			size: deleteMediaRes.data.file_size,
			processedSize: processedImagesRes.data.reduce(
				(acc, i) => acc + i.file_size,
				0,
			),
		}),
	]);
	if (deleteObjectRes.error) return deleteObjectRes;

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
