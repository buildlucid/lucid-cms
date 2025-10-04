import { getFileMetadata } from "../../../utils/media/index.js";
import type { MediaType } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import services from "../../index.js";

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
	const mediaStrategyRes = services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const mediaMetaRes = await mediaStrategyRes.data.getMeta(data.key);
	if (mediaMetaRes.error) return mediaMetaRes;

	const proposedSizeRes = await services.media.checks.checkCanStoreMedia(
		context,
		{
			size: mediaMetaRes.data.size,
			onError: async () => {
				await mediaStrategyRes.data.deleteSingle(data.key);
			},
		},
	);
	if (proposedSizeRes.error) return proposedSizeRes;

	const fileMetaData = await getFileMetadata({
		mimeType: mediaMetaRes.data.mimeType,
		fileName: data.fileName,
	});
	if (fileMetaData.error) return fileMetaData;

	const updateStorageRes = await services.option.updateSingle(context, {
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
