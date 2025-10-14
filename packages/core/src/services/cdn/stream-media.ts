import type { Readable } from "node:stream";
import constants from "../../constants/constants.js";
import type { StreamSingleQueryParams } from "../../schemas/cdn.js";
import {
	chooseAcceptHeaderFormat,
	generateProcessKey,
} from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import services from "../index.js";

/**
 * Streams the media based on the key.
 * If a preset is provided, it will generate a processed image and stream that.
 * @todo add a check for whether the given key is a processed image. If it is, stream the processed image and dont allow reszing/formatting.
 * @todo add a media type check, if its not an image then dont allow reszing/formatting.
 * @todo add a check to see if the media is public. If not it will require a generated media url.
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
	const selectedPreset =
		context.config.media.imagePresets?.[data.query.preset ?? ""];
	const format = context.config.media.onDemandFormats
		? chooseAcceptHeaderFormat(data.accept, data.query.format)
		: selectedPreset?.format;
	const quality = selectedPreset?.quality ?? constants.media.imagePresetQuality;

	const mediaStrategyRes =
		await services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	// ------------------------------
	// OG Image
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
		public: true,
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
	return await services.processedImages.processImage(context, {
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
