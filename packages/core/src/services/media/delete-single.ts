import cacheKeys from "../../libs/kv-adapter/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv-adapter/http-cache.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const Media = new MediaRepository(context.db, context.config.db);
	const deleteMediaRes = await Media.updateSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		data: {
			is_deleted: true,
			is_deleted_at: new Date().toISOString(),
			deleted_by: data.userId,
		},
		validation: {
			enabled: false,
		},
	});
	if (deleteMediaRes.error) return deleteMediaRes;

	await Promise.all([
		context.kv.command.delete(cacheKeys.http.static.clientMediaSingle(data.id)),
		invalidateHttpCacheTags(context.kv, [cacheKeys.http.tags.clientMedia]),
	]);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
