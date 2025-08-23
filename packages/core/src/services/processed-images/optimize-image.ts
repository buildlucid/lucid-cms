import passthroughProcessor from "../../libs/image-processor/passthrough-processor.js";
import type { Readable } from "node:stream";
import type { ServiceFn } from "../../utils/services/types.js";
import type {
	ImageProcessorOptions,
	ImageProcessorResult,
} from "../../types/config.js";

const optimizeImage: ServiceFn<
	[
		{
			stream: Readable;
			options: ImageProcessorOptions;
		},
	],
	ImageProcessorResult
> = async (context, data) => {
	if (context.config.media.imageProcessor) {
		return await context.config.media.imageProcessor(data.stream, data.options);
	}

	try {
		const { default: sharpProcessor } = await import(
			"../../libs/image-processor/sharp-processor.js"
		);
		return await sharpProcessor(data.stream, data.options);
	} catch (error) {
		return await passthroughProcessor(data.stream, data.options);
	}
};

export default optimizeImage;
