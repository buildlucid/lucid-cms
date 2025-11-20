import T from "../../translations/index.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { invalidateHttpCacheTags } from "../../libs/kv-adapter/http-cache.js";
import cacheKeys from "../../libs/kv-adapter/cache-keys.js";

const moveFolder: ServiceFn<
	[
		{
			id: number;
			folderId: number | null;
			userId: number;
		},
	],
	number | undefined
> = async (context, data) => {
	const Media = new MediaRepository(context.db, context.config.db);

	const mediaRes = await Media.selectSingle({
		select: ["id", "folder_id", "is_deleted"],
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

	if (mediaRes.data.is_deleted) {
		return {
			error: {
				type: "basic",
				message: T("you_cannot_move_a_deleted_media"),
				status: 400,
			},
		};
	}

	const mediaUpdateRes = await Media.updateSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		data: {
			folder_id: data.folderId,
			updated_by: data.userId,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (mediaUpdateRes.error) return mediaUpdateRes;

	await Promise.all([
		context.kv.command.delete(cacheKeys.http.static.clientMediaSingle(data.id)),
		invalidateHttpCacheTags(context.kv, [cacheKeys.http.tags.clientMedia]),
	]);

	return {
		error: undefined,
		data: mediaUpdateRes.data.id,
	};
};

export default moveFolder;
