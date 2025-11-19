import T from "../../../translations/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { optionServices } from "../../index.js";

const checkCanStoreMedia: ServiceFn<
	[
		{
			size: number;
			onError?: () => Promise<void>;
		},
	],
	{
		proposedSize: number;
	}
> = async (context, data) => {
	const maxFileSize = context.config.media.maxFileSize;
	const storageLimit = context.config.media.storageLimit;

	if (data.size > maxFileSize) {
		if (data.onError) {
			await data.onError();
		}
		return {
			error: {
				type: "basic",
				message: T("file_too_large_max_size_is", {
					size: maxFileSize,
				}),
				status: 500,
				errors: {
					file: {
						code: "storage",
						message: T("file_too_large_max_size_is", {
							size: maxFileSize,
						}),
					},
				},
			},
			data: undefined,
		};
	}

	const storageUsedRes = await optionServices.getSingle(context, {
		name: "media_storage_used",
	});
	if (storageUsedRes.error) return storageUsedRes;

	const proposedSize = (storageUsedRes.data.valueInt || 0) + data.size;
	if (proposedSize > storageLimit) {
		if (data.onError) {
			await data.onError();
		}
		return {
			error: {
				type: "basic",
				message: T("file_exceeds_storage_limit_max_limit_is", {
					size: storageLimit,
				}),
				status: 500,
				errors: {
					file: {
						code: "storage",
						message: T("file_exceeds_storage_limit_max_limit_is", {
							size: storageLimit,
						}),
					},
				},
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

export default checkCanStoreMedia;
