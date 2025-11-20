import {
	MediaRepository,
	ProcessedImagesRepository,
} from "../../libs/repositories/index.js";
import type { ImageProcessorOptions } from "../../types/config.js";
import type { MediaUrlResponse } from "../../types/response.js";
import { createMediaUrl, generateProcessKey } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices, processedImageServices } from "../index.js";

const processMedia: ServiceFn<
	[
		{
			key: string;
			body: ImageProcessorOptions;
		},
	],
	MediaUrlResponse
> = async (context, data) => {
	const Media = new MediaRepository(context.db, context.config.db);
	const ProcessedImage = new ProcessedImagesRepository(
		context.db,
		context.config.db,
	);

	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	//* fetches the media item, if its not an image return the original url
	const mediaRes = await Media.selectSingle({
		select: ["type"],
		where: [
			{
				key: "type",
				operator: "=",
				value: "image",
			},
		],
	});
	if (mediaRes.error) return mediaRes;
	if (mediaRes.data?.type !== "image") {
		return {
			error: undefined,
			data: {
				url: createMediaUrl({
					key: data.key,
					host: context.config.host,
					urlStrategy: context.config.media?.urlStrategy,
				}),
			},
		};
	}

	//* if no processing is requested, return the original url
	if (
		data.body.format === undefined &&
		data.body?.width === undefined &&
		data.body?.height === undefined &&
		data.body?.quality === undefined
	) {
		return {
			error: undefined,
			data: {
				url: createMediaUrl({
					key: data.key,
					host: context.config.host,
					urlStrategy: context.config.media?.urlStrategy,
				}),
			},
		};
	}

	//* generate the process key
	const processKey = generateProcessKey({
		key: data.key,
		options: {
			format: data.body.format,
			quality: data.body.quality,
			width: data.body.width,
			height: data.body.height,
		},
	});

	//* check if the processed media already exists
	const processedImageRes = await ProcessedImage.selectSingle({
		select: ["key"],
		where: [
			{
				key: "key",
				operator: "=",
				value: processKey,
			},
		],
	});
	if (processedImageRes.error) return processedImageRes;
	if (processedImageRes.data) {
		return {
			error: undefined,
			data: {
				url: createMediaUrl({
					key: processKey,
					host: context.config.host,
					urlStrategy: context.config.media?.urlStrategy,
				}),
			},
		};
	}

	//* process the image
	const processRes = await processedImageServices.processImage(context, {
		key: data.key,
		processKey: processKey,
		options: {
			format: data.body.format,
			quality: data.body.quality,
			width: data.body.width,
			height: data.body.height,
		},
	});
	if (processRes.error) return processRes;

	return {
		error: undefined,
		data: {
			url: createMediaUrl({
				key: processKey,
				host: context.config.host,
				urlStrategy: context.config.media?.urlStrategy,
			}),
		},
	};
};

export default processMedia;
