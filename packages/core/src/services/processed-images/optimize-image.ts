import type { Readable } from "node:stream";
import getImageProcessor from "../../libs/image-processor/get-processor.js";
import type {
	ImageProcessorOptions,
	ImageProcessorResult,
} from "../../types/config.js";
import type { ServiceFn } from "../../utils/services/types.js";

const optimizeImage: ServiceFn<
	[
		{
			stream: Readable;
			options: ImageProcessorOptions;
		},
	],
	ImageProcessorResult
> = async (context, data) => {
	const targetProcessor = await getImageProcessor(context.config);
	return await targetProcessor(data.stream, data.options);
};

export default optimizeImage;
