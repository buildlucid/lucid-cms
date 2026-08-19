import type { MediaProcessOptions } from "@lucidcms/types";
import { copy } from "../../libs/i18n/index.js";
import type { MediaDeliveryFile } from "../../libs/media-delivery/types.js";
import { MediaRepository } from "../../libs/repositories/index.js";
import type { MediaUrl } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import {
	createMediaUrl,
	isProcessedImageKey,
	normalizeMediaKey,
	resolveDeliveryUrl,
	resolveProcessingRequest,
} from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkHasMediaStorage from "./checks/check-has-media-storage.js";

const processMedia: ServiceFn<
	[
		{
			key: string;
			body: MediaProcessOptions;
		},
	],
	MediaUrl
> = async (context, data) => {
	const baseUrl = getBaseUrl(context);
	const normalizedKey = normalizeMediaKey(data.key);

	if (isProcessedImageKey(normalizedKey)) {
		return {
			error: {
				type: "basic",
				status: 404,
				name: copy("server:core.media.not.found.name"),
				message: copy("server:core.media.not.found.message"),
			},
			data: undefined,
		};
	}

	const Media = new MediaRepository(context.db);

	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	//* resolves the source and its active crop in a single lookup
	const mediaRes = await Media.selectSingleActivePresentationByKey({
		key: normalizedKey,
	});
	if (mediaRes.error) return mediaRes;

	if (!mediaRes.data) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.media.not.found.message"),
			},
			data: undefined,
		};
	}

	const file: MediaDeliveryFile = {
		key: mediaRes.data.key,
		fileName: mediaRes.data.file_name,
		type: mediaRes.data.type,
		mimeType: mediaRes.data.mime_type,
		extension: mediaRes.data.file_extension,
		width: mediaRes.data.width,
		height: mediaRes.data.height,
		focalPoint:
			mediaRes.data.focal_x !== null && mediaRes.data.focal_y !== null
				? {
						x: mediaRes.data.focal_x / 10000,
						y: mediaRes.data.focal_y / 10000,
					}
				: null,
		storage: {
			adapterKey: mediaRes.data.storage_adapter_key,
			adapterReference: mediaRes.data.storage_adapter_reference,
			adapterData: mediaRes.data.storage_adapter_data,
		},
	};

	const isPublic = mediaRes.data.public === true || mediaRes.data.public === 1;

	if (mediaRes.data.type !== "image") {
		return {
			error: undefined,
			data: {
				url:
					resolveDeliveryUrl({
						delivery: context.mediaDelivery,
						file,
						host: baseUrl,
						public: isPublic,
					}) ??
					createMediaUrl({
						key: mediaRes.data.key,
						host: baseUrl,
						fileName: mediaRes.data.file_name,
						extension: mediaRes.data.file_extension,
					}),
			},
		};
	}

	const processingRequest = resolveProcessingRequest({
		presets: context.config.media.images.presets,
		allowFormatQuery: context.config.media.images.allowFormatQuery,
		query: data.body,
	});

	if (!processingRequest.hasProcessing) {
		return {
			error: undefined,
			data: {
				url:
					resolveDeliveryUrl({
						delivery: context.mediaDelivery,
						file,
						host: baseUrl,
						public: isPublic,
					}) ??
					createMediaUrl({
						key: mediaRes.data.key,
						host: baseUrl,
						fileName: mediaRes.data.file_name,
						extension: mediaRes.data.file_extension,
					}),
			},
		};
	}

	const transformation = {
		format: processingRequest.format,
		quality: processingRequest.quality,
		width: processingRequest.width,
		height: processingRequest.height,
		fit: processingRequest.fit,
		rotate: processingRequest.rotate,
		focalPoint: file.focalPoint ?? undefined,
	};

	return {
		error: undefined,
		data: {
			url:
				resolveDeliveryUrl({
					delivery: context.mediaDelivery,
					file,
					host: baseUrl,
					public: isPublic,
					transformation,
					query: processingRequest.publicQuery,
				}) ??
				resolveDeliveryUrl({
					delivery: context.mediaDelivery,
					file,
					host: baseUrl,
					public: isPublic,
				}) ??
				createMediaUrl({
					key: mediaRes.data.key,
					host: baseUrl,
					fileName: mediaRes.data.file_name,
					extension: mediaRes.data.file_extension,
				}),
		},
	};
};

export default processMedia;
