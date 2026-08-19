import { copy } from "../../../libs/i18n/index.js";
import type { MediaStatus, MediaType } from "../../../types/response.js";
import { formatBytes } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import adjustStorageUsage from "../adjust-storage-usage.js";
import checkCanStoreMedia from "../checks/check-can-store-media.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";
import validateUploadedMedia from "../helpers/validate-uploaded-media.js";

const syncMedia: ServiceFn<
	[
		{
			key: string;
			fileName: string;
			allowedType?: MediaType;
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
		status: MediaStatus;
		storageAdapterKey: string;
		storageAdapterReference: string | null;
		storageAdapterData: Record<string, unknown> | null;
	}
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const mediaMetaRes = await mediaStorageRes.data.getMeta(context, {
		key: data.key,
	});
	if (mediaMetaRes.error) return mediaMetaRes;

	const proposedSizeRes = await checkCanStoreMedia(context, {
		size: mediaMetaRes.data.size,
	});
	if (proposedSizeRes.error) {
		await mediaStorageRes.data.delete(context, {
			key: data.key,
		});
		return proposedSizeRes;
	}

	const fileMetaData = await validateUploadedMedia({
		context,
		stream: mediaStorageRes.data.stream,
		key: data.key,
		mimeType: mediaMetaRes.data.mimeType,
		fileName: data.fileName,
		allowedType: data.allowedType,
	});
	if (fileMetaData.error) {
		await mediaStorageRes.data.delete(context, {
			key: data.key,
		});
		return fileMetaData;
	}

	const storageLimit = context.config.media.limits.storageBytes;
	const adjustStorageRes = await adjustStorageUsage(context, {
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

		await mediaStorageRes.data.delete(context, {
			key: data.key,
		});

		return {
			error: {
				type: "basic",
				message: copy("server:core.files.validation.storage.limit.exceeded", {
					data: {
						size: formatBytes(storageLimit),
					},
				}),
				status: 500,
				errors: {
					file: {
						code: "storage",
						message: copy(
							"server:core.files.validation.storage.limit.exceeded",
							{
								data: {
									size: formatBytes(storageLimit),
								},
							},
						),
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
			status: mediaMetaRes.data.status,
			storageAdapterKey: mediaStorageRes.data.key,
			storageAdapterReference: mediaMetaRes.data.adapterReference ?? null,
			storageAdapterData: mediaMetaRes.data.adapterData ?? null,
		},
	};
};

export default syncMedia;
