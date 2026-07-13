import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import cacheKeys from "../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv/http-cache.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";
import clearClientMediaSingleCache from "./helpers/clear-client-media-cache.js";
import permanentlyDeleteMedia from "./helpers/permanently-delete-media.js";

const deleteMultiplePermanently: ServiceFn<
	[
		{
			ids: number[];
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	if (!data.ids || data.ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
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
	if (missing.length > 0) {
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

	for (const id of data.ids) {
		const deleteRes = await permanentlyDeleteMedia(context, {
			id,
			invalidateCache: false,
		});
		if (deleteRes.error) return deleteRes;
	}

	await Promise.all([
		...data.ids.map((id) => clearClientMediaSingleCache(context, id)),
		invalidateHttpCacheTags(context, [cacheKeys.http.tags.clientMedia]),
	]);

	const hookRes = await executeHooks(
		context,
		{
			service: "media",
			event: "afterDelete",
			config: context.config,
		},
		{
			meta: {
				tenantKey: context.request.tenantKey ?? null,
			},
			data: {
				ids: data.ids,
				userId: data.userId,
				hardDelete: true,
			},
		},
	);
	if (hookRes.error) return hookRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteMultiplePermanently;
