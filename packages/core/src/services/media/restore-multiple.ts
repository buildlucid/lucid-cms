import { copy } from "../../libs/i18n/index.js";
import cacheKeys from "../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv/http-cache.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";
import clearClientMediaSingleCache from "./helpers/clear-client-media-cache.js";

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

	const Media = new MediaRepository(context.db.client, context.config.db);

	const accessRes = await mediaServices.checks.checkMediaAccess(context, {
		ids: data.ids,
	});
	if (accessRes.error) return accessRes;

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
				message: copy("server:core.media.not.found.message"),
				errors: {
					ids: {
						message: copy("server:core.documents.ids.not.found.partial", {
							data: {
								ids: existRes.data.map((m) => m.id).join(", "),
							},
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
			clearClientMediaSingleCache(context.kv, context.config, id),
		),
		invalidateHttpCacheTags(context.kv, [cacheKeys.http.tags.clientMedia]),
	]);

	return { error: undefined, data: undefined };
};

export default restoreMultiple;
