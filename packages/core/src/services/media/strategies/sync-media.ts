import { copy } from "../../../libs/i18n/index.js";
import type { MediaType } from "../../../types/response.js";
import { formatBytes } from "../../../utils/helpers/index.js";
import { resolveMediaKeyTenant } from "../../../utils/media/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { mediaServices } from "../../index.js";
import adjustStorageUsage from "../adjust-storage-usage.js";
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
	}
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const tenant = resolveMediaKeyTenant(context.config, data.key);

	const mediaMetaRes = await mediaStrategyRes.data.getMeta({
		context,
		key: data.key,
		tenant,
	});
	if (mediaMetaRes.error) return mediaMetaRes;

	const proposedSizeRes = await mediaServices.checks.checkCanStoreMedia(
		context,
		{
			size: mediaMetaRes.data.size,
		},
	);
	if (proposedSizeRes.error) {
		await mediaStrategyRes.data.delete({
			context,
			key: data.key,
			tenant,
		});
		return proposedSizeRes;
	}

	const fileMetaData = await validateUploadedMedia({
		context,
		stream: mediaStrategyRes.data.stream,
		tenant,
		key: data.key,
		mimeType: mediaMetaRes.data.mimeType,
		fileName: data.fileName,
		allowedType: data.allowedType,
	});
	if (fileMetaData.error) {
		await mediaStrategyRes.data.delete({
			context,
			key: data.key,
			tenant,
		});
		return fileMetaData;
	}

	const storageLimit = context.config.media.limits.storage;
	const adjustStorageRes = await adjustStorageUsage(context, {
		tenantKey: context.request?.tenantKey ?? null,
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

		await mediaStrategyRes.data.delete({
			context,
			key: data.key,
			tenant,
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
		},
	};
};

export default syncMedia;
