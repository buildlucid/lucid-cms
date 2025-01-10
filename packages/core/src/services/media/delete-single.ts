import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes =
		context.services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const Media = Repository.get("media", context.db, context.config.db);
	const ProcessedImagesRepo = Repository.get(
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

	const [processedImages, deleteMediaRes] = await Promise.all([
		ProcessedImagesRepo.selectMultiple({
			select: ["key", "file_size"],
			where: [
				{
					key: "media_key",
					operator: "=",
					value: getMediaRes.data.key,
				},
			],
		}),
		Media.deleteSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: data.id,
				},
			],
			returning: [
				"file_size",
				"id",
				"key",
				"title_translation_key_id",
				"alt_translation_key_id",
			],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (deleteMediaRes.error) return deleteMediaRes;

	const [_, deleteObjectRes, deleteTranslationsRes] = await Promise.all([
		mediaStrategyRes.data.deleteMultiple(processedImages.map((i) => i.key)),
		context.services.media.strategies.delete(context, {
			key: deleteMediaRes.data.key,
			size: deleteMediaRes.data.file_size,
			processedSize: processedImages.reduce((acc, i) => acc + i.file_size, 0),
		}),
		context.services.translation.deleteMultiple(context, {
			ids: [
				deleteMediaRes.data.title_translation_key_id,
				deleteMediaRes.data.alt_translation_key_id,
			],
		}),
	]);
	if (deleteObjectRes.error) return deleteObjectRes;
	if (deleteTranslationsRes.error) return deleteTranslationsRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
