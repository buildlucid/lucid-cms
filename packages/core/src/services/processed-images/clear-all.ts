import { ProcessedImagesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import adjustStorageUsage from "../media/adjust-storage-usage.js";
import checkHasMediaStorage from "../media/checks/check-has-media-storage.js";

// TODO: push this to a queue
const clearAll: ServiceFn<[], undefined> = async (context) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const ProcessedImages = new ProcessedImagesRepository(context.db);
	const processedImagesRes = await ProcessedImages.selectMultiple({
		select: ["key", "file_size"],
		where: [],
		validation: {
			enabled: true,
		},
	});
	if (processedImagesRes.error) return processedImagesRes;

	if (processedImagesRes.data.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const totalSize = processedImagesRes.data.reduce(
		(total, image) => total + image.file_size,
		0,
	);

	const [_, clearProcessedRes, updateStorageRes] = await Promise.all([
		mediaStorageRes.data.deleteMultiple(context, {
			keys: processedImagesRes.data.map((i) => i.key),
		}),
		ProcessedImages.deleteMultiple({
			where: [],
		}),
		adjustStorageUsage(context, {
			delta: -totalSize,
			min: 0,
		}),
	]);
	if (clearProcessedRes.error) return clearProcessedRes;
	if (updateStorageRes.error) return updateStorageRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearAll;
