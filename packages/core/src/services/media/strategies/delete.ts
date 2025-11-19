import type { ServiceFn } from "../../../utils/services/types.js";
import { mediaServices, optionServices } from "../../index.js";

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
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const storageUsedRes = await optionServices.getSingle(context, {
		name: "media_storage_used",
	});
	if (storageUsedRes.error) return storageUsedRes;

	const newStorageUsed =
		(storageUsedRes.data.valueInt || 0) - data.size - data.processedSize;

	const [_, updateStorageRes] = await Promise.all([
		mediaStrategyRes.data.services.delete(data.key),
		optionServices.updateSingle(context, {
			name: "media_storage_used",
			valueInt: newStorageUsed < 0 ? 0 : newStorageUsed,
		}),
	]);
	if (updateStorageRes.error) return updateStorageRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteObject;
