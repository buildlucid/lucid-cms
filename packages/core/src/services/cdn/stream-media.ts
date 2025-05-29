import {
	chooseAcceptHeaderFormat,
	generateProcessKey,
} from "../../utils/media/index.js";
import constants from "../../constants/constants.js";
import type { Readable } from "node:stream";
import type { ServiceFn } from "../../utils/services/types.js";
import type { StreamSingleQueryParams } from "../../schemas/cdn.js";

/**
 * Streams the media based on the key.
 * If a preset is provided, it will generate a processed image and stream that.
 * @todo add a check for whether the given key is a processed image. If it is, stream the processed image and dont allow reszing/formatting.
 */
const streamMedia: ServiceFn<
	[
		{
			key: string;
			query: StreamSingleQueryParams;
			accept: string | undefined;
		},
	],
	{
		key: string;
		contentLength: number | undefined;
		contentType: string | undefined;
		body: Readable;
	}
> = async (context, data) => {
	const selectedPreset =
		context.config.media.imagePresets?.[data.query.preset ?? ""];
	const format = context.config.media.onDemandFormats
		? chooseAcceptHeaderFormat(data.accept, data.query.format)
		: selectedPreset?.format;
	const quality = selectedPreset?.quality ?? constants.media.imagePresetQuality;

	const mediaStrategyRes =
		context.services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	// ------------------------------
	// OG Image
	if (!selectedPreset && !format) {
		const res = await mediaStrategyRes.data.stream(data.key);
		if (res.error) return res;

		return {
			error: undefined,
			data: {
				key: data.key,
				contentLength: res.data.contentLength,
				contentType: res.data.contentType,
				body: res.data.body,
			},
		};
	}

	// ------------------------------
	// Processed Image
	const processKey = generateProcessKey({
		key: data.key,
		options: {
			format,
			quality: quality.toString(),
			width: selectedPreset?.width?.toString(),
			height: selectedPreset?.height?.toString(),
		},
	});

	console.log(selectedPreset);

	console.log({
		format,
		quality: quality.toString(),
		width: selectedPreset?.width?.toString(),
		height: selectedPreset?.height?.toString(),
	});

	const res = await mediaStrategyRes.data.stream(processKey);
	if (res.data) {
		return {
			error: undefined,
			data: {
				key: processKey,
				contentLength: res.data.contentLength,
				contentType: res.data.contentType,
				body: res.data.body,
			},
		};
	}

	// Process
	return await context.services.processedImage.processImage(context, {
		key: data.key,
		processKey: processKey,
		options: {
			format,
			quality: quality.toString(),
			width: selectedPreset?.width?.toString(),
			height: selectedPreset?.height?.toString(),
		},
	});
};

export default streamMedia;
