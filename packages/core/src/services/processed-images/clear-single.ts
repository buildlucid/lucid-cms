import {
	MediaRepository,
	ProcessedImagesRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import adjustStorageUsage from "../media/adjust-storage-usage.js";
import checkHasMediaStrategy from "../media/checks/check-has-media-strategy.js";

// TODO: push this to a queue
const clearSingle: ServiceFn<
	[
		{
			id?: number;
			key?: string;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes = await checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;
	if (!data.key && data.id === undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
			},
			data: undefined,
		};
	}

	const ProcessedImages = new ProcessedImagesRepository(context.db);
	let mediaKey = data.key;

	if (mediaKey === undefined && data.id !== undefined) {
		const Media = new MediaRepository(context.db);

		const mediaRes = await Media.selectSingleById({
			id: data.id,
			validation: {
				enabled: true,
			},
		});
		if (mediaRes.error) return mediaRes;

		mediaKey = mediaRes.data.key;
	}

	const processedImagesRes = await ProcessedImages.selectMultiple({
		select: ["key", "file_size"],
		where: [
			{
				key: "media_key",
				operator: "=",
				value: mediaKey,
			},
		],
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
		(acc, i) => acc + i.file_size,
		0,
	);

	const [_, clearProcessedRes, updateStorageRes] = await Promise.all([
		mediaStrategyRes.data.deleteMultiple(context, {
			keys: processedImagesRes.data.map((i) => i.key),
		}),
		ProcessedImages.deleteMultiple({
			where: [
				{
					key: "media_key",
					operator: "=",
					value: mediaKey,
				},
			],
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

export default clearSingle;
