import type { MediaType } from "../../../types/response.js";
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
	const mediaMetaRes = await mediaStrategyRes.data.services.getMeta(
		data.updatedKey,
	);
	if (mediaMetaRes.error) return mediaMetaRes;

	// Ensure we available storage space
	const proposedSizeRes = await mediaServices.checks.checkCanUpdateMedia(
		context,
		{
			size: mediaMetaRes.data.size,
			previousSize: data.previousSize,
		},
	);
	if (proposedSizeRes.error) return proposedSizeRes;

	const fileMetaData = await getFileMetadata({
		mimeType: mediaMetaRes.data.mimeType,
		fileName: data.fileName,
	});
	if (fileMetaData.error) return fileMetaData;

	// Delete old file
	const deleteOldRes = await mediaStrategyRes.data.services.delete(
		data.previousKey,
	);
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
	const [storageRes, clearProcessRes] = await Promise.all([
		optionServices.updateSingle(context, {
			name: "media_storage_used",
			valueInt: proposedSizeRes.data.proposedSize,
		}),
		processedImageServices.clearSingle(context, {
			id: data.id,
		}),
	]);
	if (storageRes.error) return storageRes;
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
