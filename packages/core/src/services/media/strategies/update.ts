import { getFileMetadata } from "../../../utils/media/index.js";
import type { MediaType } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import services from "../../index.js";

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
	const mediaStrategyRes = services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	// Fetch meta data from new file
	const mediaMetaRes = await mediaStrategyRes.data.getMeta(data.updatedKey);
	if (mediaMetaRes.error) return mediaMetaRes;

	// Ensure we available storage space
	const proposedSizeRes = await services.media.checks.checkCanUpdateMedia(
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
	const deleteOldRes = await mediaStrategyRes.data.deleteSingle(
		data.previousKey,
	);
	if (deleteOldRes.error) {
		return {
			error: {
				type: "basic",
				message: deleteOldRes.error.message,
				status: 500,
				errors: {
					body: {
						file: {
							code: "media_error",
							message: deleteOldRes.error.message,
						},
					},
				},
			},
			data: undefined,
		};
	}

	// update storage, processed images and delete temp
	const [storageRes, clearProcessRes] = await Promise.all([
		services.options.updateSingle(context, {
			name: "media_storage_used",
			valueInt: proposedSizeRes.data.proposedSize,
		}),
		services.processedImages.clearSingle(context, {
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
