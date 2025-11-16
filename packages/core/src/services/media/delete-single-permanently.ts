import cacheKeys from "../../libs/kv-adapter/cache-keys.js";
import { invalidateHttpCacheTags } from "../../libs/kv-adapter/http-cache.js";
import Repository from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import services from "../index.js";

const deleteSinglePermanently: ServiceFn<
	[
		{
			id: number;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes =
		await services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const Media = Repository.get("media", context.db, context.config.db);
	const ProcessedImages = Repository.get(
		"processed-images",
		context.db,
		context.config.db,
	);

	const getMediaRes = await Media.selectSingle({
		select: ["key"],
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
			returning: ["file_size", "id", "key"],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (processedImagesRes.error) return processedImagesRes;
	if (deleteMediaRes.error) return deleteMediaRes;

	const [_, deleteObjectRes] = await Promise.all([
		mediaStrategyRes.data.services.deleteMultiple(
			processedImagesRes.data.map((i) => i.key),
		),
		services.media.strategies.delete(context, {
			key: deleteMediaRes.data.key,
			size: deleteMediaRes.data.file_size,
			processedSize: processedImagesRes.data.reduce(
				(acc, i) => acc + i.file_size,
				0,
			),
		}),
	]);
	if (deleteObjectRes.error) return deleteObjectRes;

	await Promise.all([
		context.kv.command.delete(cacheKeys.http.static.clientMediaSingle(data.id)),
		invalidateHttpCacheTags(context.kv, [cacheKeys.http.tags.clientMedia]),
	]);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSinglePermanently;
