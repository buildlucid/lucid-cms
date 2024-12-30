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

	const MediaRepo = Repository.get("media", context.db, context.config.db);
	const ProcessedImagesRepo = Repository.get(
		"processed-images",
		context.db,
		context.config.db,
	);

	const getMedia = await MediaRepo.selectSingle({
		select: ["key"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (getMedia === undefined) {
		return {
			error: {
				type: "basic",
				message: T("media_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const [processedImages, deleteMedia] = await Promise.all([
		ProcessedImagesRepo.selectMultiple({
			select: ["key", "file_size"],
			where: [
				{
					key: "media_key",
					operator: "=",
					value: getMedia.key,
				},
			],
		}),
		MediaRepo.deleteSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: data.id,
				},
			],
		}),
	]);
	if (deleteMedia === undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
			},
			data: undefined,
		};
	}

	const [_, deleteObjectRes, deleteTranslationsRes] = await Promise.all([
		mediaStrategyRes.data.deleteMultiple(processedImages.map((i) => i.key)),
		context.services.media.strategies.delete(context, {
			key: deleteMedia.key,
			size: deleteMedia.file_size,
			processedSize: processedImages.reduce((acc, i) => acc + i.file_size, 0),
		}),
		context.services.translation.deleteMultiple(context, {
			ids: [
				deleteMedia.title_translation_key_id,
				deleteMedia.alt_translation_key_id,
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
