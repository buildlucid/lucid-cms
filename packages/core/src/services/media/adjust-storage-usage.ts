import type { ServiceFn } from "../../utils/services/types.js";
import { optionServices } from "../index.js";

const adjustStorageUsage: ServiceFn<
	[
		{
			delta: number;
			max?: number;
			min?: number;
		},
	],
	{
		applied: boolean;
	}
> = async (context, data) => {
	return optionServices.adjustInt(context, {
		name: "media_storage_used",
		delta: data.delta,
		max: data.max,
		min: data.min,
		ensure: true,
	});
};

export default adjustStorageUsage;
