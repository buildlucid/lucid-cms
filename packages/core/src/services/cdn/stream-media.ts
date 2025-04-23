import {
	chooseAcceptHeaderFormat,
	generateProcessKey,
} from "../../utils/media/index.js";
import type { Readable } from "node:stream";
import type { ServiceFn } from "../../utils/services/types.js";
import type { StreamSingleQueryParams } from "../../schemas/cdn.js";

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
	const format = chooseAcceptHeaderFormat(data.accept, data.query.format);

	const mediaStrategyRes =
		context.services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	// ------------------------------
	// OG Image
	if (
		format === undefined &&
		data.query?.width === undefined &&
		data.query?.height === undefined &&
		data.query?.quality === undefined
	) {
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
			quality: data.query.quality,
			width: data.query.width,
			height: data.query.height,
		},
	});

	// Try and stream the processed media (may already exist)
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
			quality: data.query.quality,
			width: data.query.width,
			height: data.query.height,
		},
	});
};

export default streamMedia;
