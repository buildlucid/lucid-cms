import type { ServiceFn } from "../../../utils/services/types.js";
import adjustStorageUsage from "../adjust-storage-usage.js";
import checkHasMediaStrategy from "../checks/check-has-media-strategy.js";

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
	const mediaStrategyRes = await checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const [_, updateStorageRes] = await Promise.all([
		mediaStrategyRes.data.delete(context, {
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
