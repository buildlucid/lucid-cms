import {
	MediaRepository,
	ProcessedImagesRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getStorageUsage: ServiceFn<
	[],
	{
		media: number;
		processedImages: number;
		total: number;
	}
> = async (context) => {
	const Media = new MediaRepository(context.db.client, context.config.db);
	const ProcessedImages = new ProcessedImagesRepository(
		context.db.client,
		context.config.db,
	);

	const [mediaSizeRes, processedImagesSizeRes] = await Promise.all([
		Media.sumFileSize(),
		ProcessedImages.sumFileSize(),
	]);
	if (mediaSizeRes.error) return mediaSizeRes;
	if (processedImagesSizeRes.error) return processedImagesSizeRes;

	const media = mediaSizeRes.data;
	const processedImages = processedImagesSizeRes.data;

	return {
		error: undefined,
		data: {
			media,
			processedImages,
			total: media + processedImages,
		},
	};
};

export default getStorageUsage;
