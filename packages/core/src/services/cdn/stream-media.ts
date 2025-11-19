import type { Readable } from "node:stream";
import constants from "../../constants/constants.js";
import type { StreamSingleQueryParams } from "../../schemas/cdn.js";
import {
	chooseAcceptHeaderFormat,
	generateProcessKey,
	isProcessedImageKey,
} from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices, processedImageServices } from "../index.js";

/**
 * Streams the media based on the key.
 * If a preset is provided, it will generate a processed image and stream that.
 */
const streamMedia: ServiceFn<
	[
		{
			key: string;
			query: StreamSingleQueryParams;
			accept: string | undefined;
			range?: {
				start: number;
				end?: number;
			};
		},
	],
	{
		key: string;
		contentLength: number | undefined;
		contentType: string | undefined;
		body: Readable;
		isPartialContent?: boolean;
		totalSize?: number;
		range?: {
			start: number;
			end: number;
		};
	}
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const isProcessedKey = isProcessedImageKey(data.key);

	//* if its already processed, dont allow it to be processed further
	if (isProcessedKey) {
		const res = await mediaStrategyRes.data.services.stream(data.key, {
			range: data.range,
		});
		if (res.error) return res;
		return {
			error: undefined,
			data: {
				key: data.key,
				contentLength: res.data.contentLength,
				contentType: res.data.contentType,
				body: res.data.body,
				isPartialContent: res.data.isPartialContent,
				totalSize: res.data.totalSize,
				range: res.data.range,
			},
		};
	}

	// ------------------------------
	// OG Image

	const selectedPreset =
		context.config.media.imagePresets?.[data.query.preset ?? ""];
	const format = context.config.media.onDemandFormats
		? chooseAcceptHeaderFormat(data.accept, data.query.format)
		: selectedPreset?.format;
	const quality = selectedPreset?.quality ?? constants.media.imagePresetQuality;

	if (!selectedPreset && !format) {
		const res = await mediaStrategyRes.data.services.stream(data.key, {
			range: data.range,
		});
		if (res.error) return res;
		return {
			error: undefined,
			data: {
				key: data.key,
				contentLength: res.data.contentLength,
				contentType: res.data.contentType,
				body: res.data.body,
				isPartialContent: res.data.isPartialContent,
				totalSize: res.data.totalSize,
				range: res.data.range,
			},
		};
	}

	// ------------------------------
	// Processed Image
	const processKey = generateProcessKey({
		key: data.key,
		options: {
			format,
			quality: quality,
			width: selectedPreset?.width,
			height: selectedPreset?.height,
		},
	});

	const res = await mediaStrategyRes.data.services.stream(processKey, {
		range: data.range,
	});
	if (res.data) {
		return {
			error: undefined,
			data: {
				key: processKey,
				contentLength: res.data.contentLength,
				contentType: res.data.contentType,
				body: res.data.body,
				isPartialContent: res.data.isPartialContent,
				totalSize: res.data.totalSize,
				range: res.data.range,
			},
		};
	}

	// Process
	return await processedImageServices.processImage(context, {
		key: data.key,
		processKey: processKey,
		options: {
			format,
			quality: quality,
			width: selectedPreset?.width,
			height: selectedPreset?.height,
		},
	});
};

export default streamMedia;
