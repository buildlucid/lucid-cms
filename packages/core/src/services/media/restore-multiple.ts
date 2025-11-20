import cacheKeys from "../../libs/kv-adapter/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv-adapter/http-cache.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const restoreMultiple: ServiceFn<
	[
		{
			ids: number[];
		},
	],
	undefined
> = async (context, data) => {
	if (!data.ids || data.ids.length === 0) {
		return { error: undefined, data: undefined };
	}

	const Media = new MediaRepository(context.db, context.config.db);

	const existRes = await Media.selectMultiple({
		select: ["id"],
		where: [
			{
				key: "id",
				operator: "in",
				value: data.ids,
			},
		],
		validation: { enabled: true },
	});
	if (existRes.error) return existRes;

	const existing = new Set(existRes.data.map((r) => r.id));
	const missing = data.ids.filter((id) => !existing.has(id));
	const idsExist = missing.length === 0;
	if (!idsExist) {
		return {
			error: {
				type: "basic",
				message: T("media_not_found_message"),
				errors: {
					ids: {
						message: T("only_found_ids_error_message", {
							ids: existRes.data.map((m) => m.id).join(", "),
						}),
					},
				},
				status: 404,
			},
			data: undefined,
		};
	}

	const updateRes = await Media.updateSingle({
		data: {
			is_deleted: false,
			is_deleted_at: null,
			deleted_by: null,
		},
		where: [
			{
				key: "id",
				operator: "in",
				value: data.ids,
			},
		],
		returning: ["id"],
		validation: { enabled: true },
	});
	if (updateRes.error) return updateRes;

	await Promise.all([
		...data.ids.map((id) =>
			context.kv.command.delete(cacheKeys.http.static.clientMediaSingle(id)),
		),
		invalidateHttpCacheTags(context.kv, [cacheKeys.http.tags.clientMedia]),
	]);

	return { error: undefined, data: undefined };
};

export default restoreMultiple;
