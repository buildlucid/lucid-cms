import T from "../../../translations/index.js";
import type { MediaType } from "../../../types/response.js";
import { formatBytes } from "../../../utils/helpers/index.js";
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

	const mediaMetaRes = await mediaStrategyRes.data.getMeta(data.key);
	if (mediaMetaRes.error) return mediaMetaRes;

	const proposedSizeRes = await mediaServices.checks.checkCanStoreMedia(
		context,
		{
			size: mediaMetaRes.data.size,
		},
	);
	if (proposedSizeRes.error) {
		await mediaStrategyRes.data.delete(data.key);
		return proposedSizeRes;
	}

	const fileMetaData = await getFileMetadata({
		mimeType: mediaMetaRes.data.mimeType,
		fileName: data.fileName,
	});
	if (fileMetaData.error) return fileMetaData;

	const storageLimit = context.config.media.limits.storage;
	const adjustStorageRes = await optionServices.adjustInt(context, {
		name: "media_storage_used",
		delta: mediaMetaRes.data.size,
		max: storageLimit === false ? undefined : storageLimit,
		min: 0,
	});
	if (adjustStorageRes.error) return adjustStorageRes;
	if (!adjustStorageRes.data.applied) {
		if (storageLimit === false) {
			return {
				error: {
					type: "basic",
					status: 500,
				},
				data: undefined,
			};
		}

		await mediaStrategyRes.data.delete(data.key);
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
