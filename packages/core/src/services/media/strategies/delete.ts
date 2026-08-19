import type { ServiceFn } from "../../../utils/services/types.js";
import adjustStorageUsage from "../adjust-storage-usage.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";

const deleteObject: ServiceFn<
	[
		{
			key: string;
			size: number;
			processedSize: number;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const [_, updateStorageRes] = await Promise.all([
		mediaStorageRes.data.delete(context, {
			key: data.key,
		}),
		adjustStorageUsage(context, {
			delta: -(data.size + data.processedSize),
			min: 0,
		}),
	]);
	if (updateStorageRes.error) return updateStorageRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteObject;
