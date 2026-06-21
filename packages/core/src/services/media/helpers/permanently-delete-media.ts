import { copy } from "../../../libs/i18n/index.js";
import cacheKeys from "../../../libs/kv/cache-keys.js";
import { invalidateHttpCacheTags } from "../../../libs/kv/http-cache.js";
import {
	MediaRepository,
	ProcessedImagesRepository,
} from "../../../libs/repositories/index.js";
import { resolveMediaKeyTenant } from "../../../utils/media/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { mediaServices } from "../../index.js";
import clearClientMediaSingleCache from "./clear-client-media-cache.js";

const permanentlyDeleteMedia: ServiceFn<
	[
		{
			id: number;
			deletePoster?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const Media = new MediaRepository(context.db.client, context.config.db);
	const ProcessedImages = new ProcessedImagesRepository(
		context.db.client,
		context.config.db,
	);

	const getMediaRes = await Media.selectSingleById({
		id: data.id,
		tenantKey: context.request.tenantKey,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.media.not.found.message"),
				status: 404,
			},
		},
	});
	if (getMediaRes.error) return getMediaRes;

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
			returning: ["file_size", "id", "key", "tenant_key"],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (processedImagesRes.error) return processedImagesRes;
	if (deleteMediaRes.error) return deleteMediaRes;
	const tenant = resolveMediaKeyTenant(context.config, deleteMediaRes.data.key);

	const [_, deleteObjectRes] = await Promise.all([
		mediaStrategyRes.data.deleteMultiple({
			context,
			keys: processedImagesRes.data.map((i) => i.key),
			tenant,
		}),
		mediaServices.strategies.deleteObject(context, {
			key: deleteMediaRes.data.key,
			size: deleteMediaRes.data.file_size,
			processedSize: processedImagesRes.data.reduce(
				(acc, i) => acc + i.file_size,
				0,
			),
			tenantKey: deleteMediaRes.data.tenant_key,
		}),
	]);
	if (deleteObjectRes.error) return deleteObjectRes;

	if (data.deletePoster === true && getMediaRes.data.poster_id !== null) {
		const posterDeleteRes = await permanentlyDeleteMedia(context, {
			id: getMediaRes.data.poster_id,
			deletePoster: false,
		});
		if (posterDeleteRes.error) return posterDeleteRes;
	}

	await Promise.all([
		clearClientMediaSingleCache(context, data.id),
		invalidateHttpCacheTags(context, [cacheKeys.http.tags.clientMedia]),
	]);

	return {
		error: undefined,
		data: undefined,
	};
};

export default permanentlyDeleteMedia;
