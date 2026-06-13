import { copy } from "../../libs/i18n/index.js";
import cacheKeys from "../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv/http-cache.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import clearClientMediaSingleCache from "./helpers/clear-client-media-cache.js";

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
	const Media = new MediaRepository(context.db.client, context.config.db);

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
				message: copy("server:core.media.not.found.message"),
				status: 404,
			},
		},
	});
	if (mediaRes.error) return mediaRes;

	if (mediaRes.data.is_deleted) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.media.move.deleted.denied"),
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
		clearClientMediaSingleCache(context.kv, context.config, data.id),
		invalidateHttpCacheTags(context.kv, [cacheKeys.http.tags.clientMedia]),
	]);

	return {
		error: undefined,
		data: mediaUpdateRes.data.id,
	};
};

export default moveFolder;
