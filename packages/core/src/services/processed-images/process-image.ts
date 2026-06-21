import { PassThrough } from "node:stream";
import {
	splitBodyForProcessing,
	toNodeReadable,
} from "../../libs/media/index.js";
import type { MediaAdapterStreamBody } from "../../libs/media/types.js";
import { ProcessedImagesRepository } from "../../libs/repositories/index.js";
import type { ImageProcessorOptions } from "../../types/config.js";
import { createBufferETag, matchesETag } from "../../utils/http/etag.js";
import {
	getMediaKeyTenantKey,
	resolveMediaKeyTenant,
} from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices, processedImageServices } from "../index.js";
import adjustStorageUsage from "../media/adjust-storage-usage.js";

const processImage: ServiceFn<
	[
		{
			key: string;
			processKey: string;
			ifNoneMatch?: string;
			options: ImageProcessorOptions;
		},
	],
	{
		key: string;
		contentLength: number | undefined;
		contentType: string | undefined;
		body: MediaAdapterStreamBody;
		etag?: string | null;
		notModified?: boolean;
	}
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const sourceTenant = resolveMediaKeyTenant(context.config, data.key);
	const processedTenant = resolveMediaKeyTenant(
		context.config,
		data.processKey,
	);
	const sourceTenantKey = getMediaKeyTenantKey(data.key);

	// get og image
	const mediaRes = await mediaStrategyRes.data.stream({
		context,
		key: data.key,
		tenant: sourceTenant,
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

	// Optimize image
	const [imageRes, processedCountRes] = await Promise.all([
		processedImageServices.optimizeImage(context, {
			stream: toNodeReadable(processingBody),
			options: data.options,
		}),
		processedImageServices.getSingleCount(context, {
			key: data.key,
		}),
	]);

	if (imageRes.error || processedCountRes.error || !imageRes.data) {
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
	if (processedCountRes.data >= context.config.media.limits.processedImages) {
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
	const canStoreRes = await processedImageServices.checks.checkCanStore(
		context,
		{
			size: imageRes.data.size,
			tenantKey: sourceTenantKey,
		},
	);
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

	const ProcessedImages = new ProcessedImagesRepository(
		context.db.client,
		context.config.db,
	);

	if (context.config.media.images.storeProcessed === true) {
		const storageLimit = context.config.media.limits.storage;
		const adjustStorageRes = await adjustStorageUsage(context, {
			tenantKey: sourceTenantKey,
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
			mediaStrategyRes.data.upload({
				context,
				key: data.processKey,
				data: imageRes.data.buffer,
				meta: {
					mimeType: imageRes.data.mimeType,
					extension: imageRes.data.extension,
					size: imageRes.data.size,
					type: "image",
				},
				tenant: processedTenant,
			}),
		]);

		if (
			createProcessedImageRes.error !== undefined ||
			uploadRes.error !== undefined
		) {
			await adjustStorageUsage(context, {
				tenantKey: sourceTenantKey,
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
					? mediaStrategyRes.data.delete({
							context,
							key: data.processKey,
							tenant: processedTenant,
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
