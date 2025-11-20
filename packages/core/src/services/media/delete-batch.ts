import cacheKeys from "../../libs/kv-adapter/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv-adapter/http-cache.js";
import {
	MediaRepository,
	MediaFoldersRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";

const deleteBatch: ServiceFn<
	[
		{
			mediaIds: number[];
			folderIds: number[];
			recursiveMedia: boolean;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const Media = new MediaRepository(context.db, context.config.db);
	const MediaFolders = new MediaFoldersRepository(
		context.db,
		context.config.db,
	);

	if (
		(data.mediaIds?.length ?? 0) === 0 &&
		(data.folderIds?.length ?? 0) === 0
	) {
		return { error: undefined, data: undefined };
	}

	let descendantFolderIds: number[] = [];
	if (data.recursiveMedia && data.folderIds && data.folderIds.length > 0) {
		const execFolders = await MediaFolders.getDescendantIds({
			folderIds: data.folderIds,
		});
		if (execFolders.error) return execFolders;

		descendantFolderIds = execFolders.data.map((r) => r.id);
	}

	const updates = [
		...(data.mediaIds && data.mediaIds.length > 0
			? [
					Media.updateMultiple({
						where: [{ key: "id", operator: "in", value: data.mediaIds }],
						data: {
							is_deleted: true,
							is_deleted_at: new Date().toISOString(),
							deleted_by: data.userId,
						},
						returning: ["id"],
					}),
				]
			: []),
		...(data.recursiveMedia && descendantFolderIds.length > 0
			? [
					Media.updateMultiple({
						where: [
							{ key: "folder_id", operator: "in", value: descendantFolderIds },
						],
						data: {
							is_deleted: true,
							is_deleted_at: new Date().toISOString(),
							deleted_by: data.userId,
						},
						returning: ["id"],
					}),
				]
			: []),
	];
	const clearCachePromises = [];
	if (updates.length > 0) {
		const res = await Promise.all(updates);
		for (const r of res) {
			if (r.error) return { error: r.error, data: undefined };
			if (r.data && r.data.length > 0) {
				for (const item of r.data) {
					clearCachePromises.push(
						context.kv.command.delete(
							cacheKeys.http.static.clientMediaSingle(item.id),
						),
					);
				}
			}
		}
	}

	//* folders are deleted after otherwise we would orphan media before being able to mark them as deleted
	if (data.folderIds && data.folderIds.length > 0) {
		const delFoldersRes = await MediaFolders.deleteMultiple({
			where: [{ key: "id", operator: "in", value: data.folderIds }],
			validation: { enabled: false },
		});
		if (delFoldersRes.error) return delFoldersRes;
	}

	await Promise.all([
		...clearCachePromises,
		invalidateHttpCacheTags(context.kv, [cacheKeys.http.tags.clientMedia]),
	]);

	return { error: undefined, data: undefined };
};

export default deleteBatch;
