import T from "../../../translations/index.js";
import type { MediaType } from "../../../types/response.js";
import { formatBytes } from "../../../utils/helpers/index.js";
import { getFileMetadata } from "../../../utils/media/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import {
	mediaServices,
	optionServices,
	processedImageServices,
} from "../../index.js";

const update: ServiceFn<
	[
		{
			id: number;
			fileName: string;
			previousSize: number;
			previousKey: string;
			updatedKey: string;
		},
	],
	{
		mimeType: string;
		type: MediaType;
		extension: string;
		size: number;
		key: string;
		etag: string | null;
	}
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	// Fetch meta data from new file
	const mediaMetaRes = await mediaStrategyRes.data.getMeta(data.updatedKey);
	if (mediaMetaRes.error) return mediaMetaRes;

	// Ensure we available storage space
	const proposedSizeRes = await mediaServices.checks.checkCanUpdateMedia(
		context,
		{
			size: mediaMetaRes.data.size,
		},
	);
	if (proposedSizeRes.error) return proposedSizeRes;

	const fileMetaData = await getFileMetadata({
		mimeType: mediaMetaRes.data.mimeType,
		fileName: data.fileName,
	});
	if (fileMetaData.error) return fileMetaData;

	// Delete old file
	const deleteOldRes = await mediaStrategyRes.data.delete(data.previousKey);
	if (deleteOldRes.error) {
		return {
			error: {
				type: "basic",
				message: deleteOldRes.error.message,
				status: 500,
				errors: {
					file: {
						code: "media_error",
						message: deleteOldRes.error.message,
					},
				},
			},
			data: undefined,
		};
	}

	// update storage, processed images and delete temp
	const delta = mediaMetaRes.data.size - data.previousSize;
	const storageLimit = context.config.media.limits.storage;
	const storageRes = await optionServices.adjustInt(context, {
		name: "media_storage_used",
		delta: delta,
		max: storageLimit === false ? undefined : storageLimit,
		min: 0,
	});
	if (storageRes.error) return storageRes;
	if (!storageRes.data.applied) {
		if (storageLimit === false) {
			return {
				error: {
					type: "basic",
					status: 500,
				},
				data: undefined,
			};
		}

		return {
			error: {
				type: "basic",
				message: T("file_exceeds_storage_limit_max_limit_is", {
					size: formatBytes(storageLimit),
				}),
				status: 500,
				errors: {
					file: {
						code: "storage",
						message: T("file_exceeds_storage_limit_max_limit_is", {
							size: formatBytes(storageLimit),
						}),
					},
				},
			},
			data: undefined,
		};
	}

	const clearProcessRes = await processedImageServices.clearSingle(context, {
		id: data.id,
	});
	if (clearProcessRes.error) return clearProcessRes;

	return {
		error: undefined,
		data: {
			mimeType: fileMetaData.data.mimeType,
			type: fileMetaData.data.type,
			extension: fileMetaData.data.extension,
			size: mediaMetaRes.data.size,
			key: data.updatedKey,
			etag: mediaMetaRes.data.etag,
		},
	};
};

export default update;
