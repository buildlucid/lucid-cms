import Repository from "../../libs/repositories/index.js";
import { PassThrough, type Readable } from "node:stream";
import type { ServiceFn } from "../../utils/services/types.js";
import type { ProcessMediaBody } from "../../schemas/media.js";

const processImage: ServiceFn<
	[
		{
			key: string;
			processKey: string;
			options: ProcessMediaBody;
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
		context.services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	// get og image
	const mediaRes = await mediaStrategyRes.data.stream(data.key);
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

	// Optimise image
	const [imageRes, processedCountRes] = await Promise.all([
		context.services.processedImage.optimiseImage(context, {
			stream: mediaRes.data.body,
			options: data.options,
		}),
		context.services.processedImage.getSingleCount(context, {
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
	const canStoreRes =
		await context.services.processedImage.checks.checkCanStore(context, {
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
			},
		};
	}

	const ProcessedImages = Repository.get(
		"processed-images",
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
			mediaStrategyRes.data.uploadSingle({
				key: data.processKey,
				data: imageRes.data.buffer,
				meta: {
					mimeType: imageRes.data.mimeType,
					extension: imageRes.data.extension,
					size: imageRes.data.size,
					width: imageRes.data.width,
					height: imageRes.data.height,
					type: "image",
				},
			}),
			context.services.option.updateSingle(context, {
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
