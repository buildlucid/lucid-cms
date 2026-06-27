import { copy } from "../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getStorageUsage from "../../media/get-storage-usage.js";

const checkCanStore: ServiceFn<
	[
		{
			size: number;
			tenantKey?: string | null;
		},
	],
	{
		proposedSize: number;
	}
> = async (context, data) => {
	const maxFileSize = context.config.media.limits.uploadBytes;
	const storageLimit = context.config.media.limits.storageBytes;

	if (data.size > maxFileSize) {
		return {
			error: undefined,
			data: {
				proposedSize: 0,
			},
		};
	}

	const storageUsageRes = await getStorageUsage(context, {
		tenantKey: data.tenantKey ?? null,
	});
	if (storageUsageRes.error) return storageUsageRes;

	const proposedSize = storageUsageRes.data.total + data.size;
	if (storageLimit !== false && proposedSize > storageLimit) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.processed.images.size.limit.exceeded"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			proposedSize: proposedSize,
		},
	};
};

export default checkCanStore;
