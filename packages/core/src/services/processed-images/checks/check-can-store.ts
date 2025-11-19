import T from "../../../translations/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { optionServices } from "../../index.js";

const checkCanStore: ServiceFn<
	[
		{
			size: number;
		},
	],
	{
		proposedSize: number;
	}
> = async (context, data) => {
	const maxFileSize = context.config.media.maxFileSize;
	const storageLimit = context.config.media.storageLimit;

	if (data.size > maxFileSize) {
		return {
			error: undefined,
			data: {
				proposedSize: 0,
			},
		};
	}

	const storageUsed = await optionServices.getSingle(context, {
		name: "media_storage_used",
	});
	if (storageUsed.error) return storageUsed;

	const proposedSize = (storageUsed.data.valueInt || 0) + data.size;
	if (proposedSize > storageLimit) {
		return {
			error: {
				type: "basic",
				message: T("processed_images_size_limit_exceeded"),
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
