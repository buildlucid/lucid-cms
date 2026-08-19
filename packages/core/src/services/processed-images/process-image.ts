import { PassThrough } from "node:stream";
import type { MediaTransformationOptions } from "../../libs/media-delivery/types.js";
import {
	splitBodyForProcessing,
	toNodeReadable,
} from "../../libs/media-storage/index.js";
import type { MediaStorageAdapterStreamBody } from "../../libs/media-storage/types.js";
import {
	MediaRepository,
	ProcessedImagesRepository,
} from "../../libs/repositories/index.js";
import { createBufferETag, matchesETag } from "../../utils/http/etag.js";
import type { ServiceFn } from "../../utils/services/types.js";
import adjustStorageUsage from "../media/adjust-storage-usage.js";
import checkHasMediaStorage from "../media/checks/check-has-media-storage.js";
import checkCanStore from "./checks/check-can-store.js";
import getSingleCount from "./get-single-count.js";
import optimizeImage from "./optimize-image.js";

const processImage: ServiceFn<
	[
		{
			key: string;
			processKey: string;
			ifNoneMatch?: string;
			options: MediaTransformationOptions;
		},
	],
	{
		key: string;
		contentLength: number | undefined;
		contentType: string | undefined;
		body: MediaStorageAdapterStreamBody;
		etag?: string | null;
		notModified?: boolean;
	}
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	// get og image
	const mediaRes = await mediaStorageRes.data.stream(context, {
		key: data.key,
	});
	if (mediaRes.error) return mediaRes;

	// If the response is not an image
	if (!mediaRes.data?.contentType?.startsWith("image/")) {
		return {
			error: undefined,
			data: {
				key: data.key,
				contentLength: mediaRes.data.contentLength,
				contentType: mediaRes.data.contentType,
				body: mediaRes.data.body,
				etag: mediaRes.data.etag,
			},
		};
	}

	const { processingBody, fallbackBody } = splitBodyForProcessing(
		mediaRes.data.body,
	);
	const Media = new MediaRepository(context.db);

	const focalRes = await Media.selectSingle({
		select: ["focal_x", "focal_y"],
		where: [{ key: "key", operator: "=", value: data.key }],
	});
	if (focalRes.error) return focalRes;

	const focalPoint =
		focalRes.data?.focal_x != null && focalRes.data.focal_y != null
			? {
					x: focalRes.data.focal_x / 10000,
					y: focalRes.data.focal_y / 10000,
				}
			: undefined;

	// Optimize image
	const [imageRes, processedCountRes] = await Promise.all([
		optimizeImage(context, {
			stream: toNodeReadable(processingBody),
			options: { ...data.options, focalPoint },
		}),
		getSingleCount(context, {
			key: data.key,
		}),
	]);

	if (
		imageRes.error ||
		processedCountRes.error ||
		!imageRes.data ||
		!imageRes.data.processed
	) {
		return {
			error: undefined,
			data: {
				key: data.key,
				contentLength: mediaRes.data.contentLength,
				contentType: mediaRes.data.contentType,
				body: fallbackBody,
				etag: mediaRes.data.etag,
			},
		};
	}

	let processedEtag = createBufferETag(imageRes.data.buffer);

	if (data.ifNoneMatch && matchesETag(data.ifNoneMatch, processedEtag)) {
		return {
			error: undefined,
			data: {
				key: data.processKey,
				contentLength: undefined,
				contentType: imageRes.data.mimeType,
				body: new Uint8Array(),
				etag: processedEtag,
				notModified: true,
			},
		};
	}

	const stream = new PassThrough();
	stream.end(imageRes.data.buffer);

	// If the image should not be stored, return the stream
	if (!imageRes.data.shouldStore) {
		return {
			error: undefined,
			data: {
				key: data.processKey,
				contentLength: imageRes.data.size,
				contentType: imageRes.data.mimeType,
				body: stream,
				etag: processedEtag,
			},
		};
	}

	// Check if the processed image limit has been reached for this key, if so return processed image without saving
	if (
		processedCountRes.data >=
		context.config.media.images.cache.maxVariantsPerFile
	) {
		return {
			error: undefined,
			data: {
				key: data.processKey,
				contentLength: imageRes.data.size,
				contentType: imageRes.data.mimeType,
				body: stream,
				etag: processedEtag,
			},
		};
	}

	// Check if we can store it
	const canStoreRes = await checkCanStore(context, {
		size: imageRes.data.size,
	});
	if (canStoreRes.error) {
		return {
			error: undefined,
			data: {
				key: data.processKey,
				contentLength: imageRes.data.size,
				contentType: imageRes.data.mimeType,
				body: stream,
				etag: processedEtag,
			},
		};
	}

	const ProcessedImages = new ProcessedImagesRepository(context.db);

	if (context.config.media.images.cache.enabled) {
		const storageLimit = context.config.media.limits.storageBytes;
		const adjustStorageRes = await adjustStorageUsage(context, {
			delta: imageRes.data.size,
			max: storageLimit === false ? undefined : storageLimit,
			min: 0,
		});
		if (adjustStorageRes.error || !adjustStorageRes.data.applied) {
			return {
				error: undefined,
				data: {
					key: data.processKey,
					contentLength: imageRes.data.size,
					contentType: imageRes.data.mimeType,
					body: stream,
					etag: processedEtag,
				},
			};
		}

		const [createProcessedImageRes, uploadRes] = await Promise.all([
			ProcessedImages.createSingle({
				data: {
					key: data.processKey,
					media_key: data.key,
					file_size: imageRes.data.size,
				},
			}),
			mediaStorageRes.data.upload(context, {
				key: data.processKey,
				body: imageRes.data.buffer,
				mimeType: imageRes.data.mimeType,
				extension: imageRes.data.extension,
				size: imageRes.data.size,
				type: "image",
			}),
		]);

		if (
			createProcessedImageRes.error !== undefined ||
			uploadRes.error !== undefined
		) {
			await adjustStorageUsage(context, {
				delta: imageRes.data.size * -1,
				min: 0,
			});

			await Promise.allSettled([
				createProcessedImageRes.error === undefined
					? ProcessedImages.deleteSingle({
							where: [{ key: "key", operator: "=", value: data.processKey }],
							returning: ["key"],
						})
					: Promise.resolve(),
				uploadRes.error === undefined
					? mediaStorageRes.data.delete(context, {
							key: data.processKey,
						})
					: Promise.resolve(),
			]);

			return {
				error: undefined,
				data: {
					key: data.processKey,
					contentLength: imageRes.data.size,
					contentType: imageRes.data.mimeType,
					body: stream,
					etag: processedEtag,
				},
			};
		}

		if (uploadRes.error === undefined && uploadRes.data?.etag) {
			processedEtag = uploadRes.data.etag;
		}
	}

	return {
		error: undefined,
		data: {
			key: data.processKey,
			contentLength: imageRes.data.size,
			contentType: imageRes.data.mimeType,
			body: stream,
			etag: processedEtag,
		},
	};
};

export default processImage;
