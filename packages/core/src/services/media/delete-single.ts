import executeHooks from "../../libs/hooks/execute-hooks.js";
import cacheKeys from "../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv/http-cache.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkHasMediaStrategy from "./checks/check-has-media-strategy.js";
import checkMediaAccess from "./checks/check-media-access.js";
import clearContentMediaSingleCache from "./helpers/clear-content-media-cache.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes = await checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const Media = new MediaRepository(context.db);

	const accessRes = await checkMediaAccess(context, {
		id: data.id,
	});
	if (accessRes.error) return accessRes;

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
		returning: ["id"],
		validation: {
			enabled: false,
		},
	});
	if (deleteMediaRes.error) return deleteMediaRes;

	await Promise.all([
		clearContentMediaSingleCache(context, data.id),
		invalidateHttpCacheTags(context, [cacheKeys.http.tags.contentMedia]),
	]);

	if (deleteMediaRes.data) {
		const hookRes = await executeHooks(
			context,
			{
				service: "media",
				event: "afterDelete",
				config: context.config,
			},
			{
				meta: {},
				data: {
					ids: [deleteMediaRes.data.id],
					userId: data.userId,
					hardDelete: false,
				},
			},
		);
		if (hookRes.error) return hookRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
