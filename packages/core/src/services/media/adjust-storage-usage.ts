import { multiTenancyEnabled } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { optionServices } from "../index.js";
import getStorageUsage from "./get-storage-usage.js";
import { getMediaStorageOptionName } from "./helpers/storage-usage-options.js";

const adjustStorageUsage: ServiceFn<
	[
		{
			tenantKey: string | null | undefined;
			delta: number;
			max?: number;
			min?: number;
		},
	],
	{
		applied: boolean;
	}
> = async (context, data) => {
	const max =
		data.max !== undefined && multiTenancyEnabled(context.config)
			? data.max
			: undefined;

	if (
		data.max !== undefined &&
		data.delta > 0 &&
		!multiTenancyEnabled(context.config)
	) {
		const storageUsageRes = await getStorageUsage(context, {
			includeAllBuckets: true,
		});
		if (storageUsageRes.error) return storageUsageRes;

		if (storageUsageRes.data.total + data.delta > data.max) {
			return {
				error: undefined,
				data: {
					applied: false,
				},
			};
		}
	}

	return optionServices.adjustInt(context, {
		name: getMediaStorageOptionName(data.tenantKey),
		delta: data.delta,
		max,
		min: data.min,
		ensure: true,
	});
};

export default adjustStorageUsage;
