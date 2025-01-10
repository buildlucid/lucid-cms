import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Periodically re-count the media storage usage.
 */
const updateMediaStorage: ServiceFn<[], undefined> = async (context) => {
	const MediaRepo = Repository.get("media", context.db, context.config.db);
	const ProcessedImagesRepo = Repository.get(
		"processed-images",
		context.db,
		context.config.db,
	);
	const Options = Repository.get("options", context.db, context.config.db);

	const [mediaItems, processeddImagesItems] = await Promise.all([
		MediaRepo.selectMultiple({
			select: ["file_size"],
			where: [],
		}),
		ProcessedImagesRepo.selectMultiple({
			select: ["file_size"],
			where: [],
		}),
	]);

	const totlaMediaSize = mediaItems.reduce((acc, item) => {
		return acc + item.file_size;
	}, 0);
	const totalProcessedImagesSize = processeddImagesItems.reduce((acc, item) => {
		return acc + item.file_size;
	}, 0);

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
