import type { MediaType } from "../../../types/response.js";
import { getFileMetadata } from "../../../utils/media/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { mediaServices, optionServices } from "../../index.js";

const syncMedia: ServiceFn<
	[
		{
			key: string;
			fileName: string;
		},
	],
	{
		mimeType: string;
		name: string;
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

	const mediaMetaRes = await mediaStrategyRes.data.services.getMeta(data.key);
	if (mediaMetaRes.error) return mediaMetaRes;

	const proposedSizeRes = await mediaServices.checks.checkCanStoreMedia(
		context,
		{
			size: mediaMetaRes.data.size,
			onError: async () => {
				await mediaStrategyRes.data.services.delete(data.key);
			},
		},
	);
	if (proposedSizeRes.error) return proposedSizeRes;

	const fileMetaData = await getFileMetadata({
		mimeType: mediaMetaRes.data.mimeType,
		fileName: data.fileName,
	});
	if (fileMetaData.error) return fileMetaData;

	const updateStorageRes = await optionServices.updateSingle(context, {
		name: "media_storage_used",
		valueInt: proposedSizeRes.data.proposedSize,
	});
	if (updateStorageRes.error) return updateStorageRes;

	return {
		error: undefined,
		data: {
			mimeType: fileMetaData.data.mimeType,
			type: fileMetaData.data.type,
			extension: fileMetaData.data.extension,
			size: mediaMetaRes.data.size,
			name: data.fileName,
			key: data.key,
			etag: mediaMetaRes.data.etag,
		},
	};
};

export default syncMedia;
