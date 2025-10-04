import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import services from "../index.js";

// TODO: push this to a queue
const clearSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes = services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const ProcessedImages = Repository.get(
		"processed-images",
		context.db,
		context.config.db,
	);
	const Media = Repository.get("media", context.db, context.config.db);

	const mediaRes = await Media.selectSingle({
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
		},
	});
	if (mediaRes.error) return mediaRes;

	const [storageUsedRes, processedImagesRes] = await Promise.all([
		services.option.getSingle(context, {
			name: "media_storage_used",
		}),
		ProcessedImages.selectMultiple({
			select: ["key", "file_size"],
			where: [
				{
					key: "media_key",
					operator: "=",
					value: mediaRes.data.key,
				},
			],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (processedImagesRes.error) return processedImagesRes;
	if (storageUsedRes.error) return storageUsedRes;

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

	const newStorageUsed = (storageUsedRes.data.valueInt || 0) - totalSize;

	const [_, clearProcessedRes, updateStorageRes] = await Promise.all([
		mediaStrategyRes.data.deleteMultiple(
			processedImagesRes.data.map((i) => i.key),
		),
		ProcessedImages.deleteMultiple({
			where: [
				{
					key: "media_key",
					operator: "=",
					value: mediaRes.data.key,
				},
			],
		}),
		services.option.updateSingle(context, {
			name: "media_storage_used",
			valueInt: newStorageUsed < 0 ? 0 : newStorageUsed,
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
