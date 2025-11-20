import {
	MediaRepository,
	ProcessedImagesRepository,
	OptionsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Recalculates and updates the media storage usage option
 */
const updateMediaStorage: ServiceFn<[], undefined> = async (context) => {
	const Media = new MediaRepository(context.db, context.config.db);
	const ProcessedImages = new ProcessedImagesRepository(
		context.db,
		context.config.db,
	);
	const Options = new OptionsRepository(context.db, context.config.db);

	const [mediaItemsRes, processedImagesRes] = await Promise.all([
		Media.selectMultiple({
			select: ["file_size"],
			validation: {
				enabled: true,
			},
		}),
		ProcessedImages.selectMultiple({
			select: ["file_size"],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (processedImagesRes.error) return processedImagesRes;
	if (mediaItemsRes.error) return mediaItemsRes;

	const totlaMediaSize = mediaItemsRes.data.reduce((acc, item) => {
		return acc + item.file_size;
	}, 0);
	const totalProcessedImagesSize = processedImagesRes.data.reduce(
		(acc, item) => {
			return acc + item.file_size;
		},
		0,
	);

	const updateMediaStorageRes = await Options.updateSingle({
		where: [
			{
				key: "name",
				operator: "=",
				value: "media_storage_used",
			},
		],
		data: {
			value_int: totlaMediaSize + totalProcessedImagesSize,
		},
		returning: ["name"],
		validation: {
			enabled: true,
		},
	});
	if (updateMediaStorageRes.error) return updateMediaStorageRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateMediaStorage;
