import { PassThrough, type Readable } from "node:stream";
import { ProcessedImagesRepository } from "../../libs/repositories/index.js";
import type { ImageProcessorOptions } from "../../types/config.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	mediaServices,
	optionServices,
	processedImageServices,
} from "../index.js";

const processImage: ServiceFn<
	[
		{
			key: string;
			processKey: string;
			options: ImageProcessorOptions;
		},
	],
	{
		key: string;
		contentLength: number | undefined;
		contentType: string | undefined;
		body: Readable;
	}
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	// get og image
	const mediaRes = await mediaStrategyRes.data.services.stream(data.key);
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
			},
		};
	}

	// Optimize image
	const [imageRes, processedCountRes] = await Promise.all([
		processedImageServices.optimizeImage(context, {
			stream: mediaRes.data.body,
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
				body: mediaRes.data.body,
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
			},
		};
	}

	// Check if the processed image limit has been reached for this key, if so return processed image without saving
	if (processedCountRes.data >= context.config.media.processedImageLimit) {
		return {
			error: undefined,
			data: {
				key: data.processKey,
				contentLength: imageRes.data.size,
				contentType: imageRes.data.mimeType,
				body: stream,
			},
		};
	}

	// Check if we can store it
	const canStoreRes = await processedImageServices.checks.checkCanStore(
		context,
		{
			size: imageRes.data.size,
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
			},
		};
	}

	const ProcessedImages = new ProcessedImagesRepository(
		context.db,
		context.config.db,
	);

	if (context.config.media.storeProcessedImages === true) {
		await Promise.all([
			ProcessedImages.createSingle({
				data: {
					key: data.processKey,
					media_key: data.key,
					file_size: imageRes.data.size,
				},
			}),
			mediaStrategyRes.data.services.upload({
				key: data.processKey,
				data: imageRes.data.buffer,
				meta: {
					mimeType: imageRes.data.mimeType,
					extension: imageRes.data.extension,
					size: imageRes.data.size,
					type: "image",
				},
			}),
			optionServices.updateSingle(context, {
				name: "media_storage_used",
				valueInt: canStoreRes.data.proposedSize,
			}),
		]);
	}

	return {
		error: undefined,
		data: {
			key: data.processKey,
			contentLength: imageRes.data.size,
			contentType: imageRes.data.mimeType,
			body: stream,
		},
	};
};

export default processImage;
