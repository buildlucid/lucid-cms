import type { Readable } from "node:stream";
import getImageProcessor from "../../libs/image-processor/get-adapter.js";
import type {
	ImageProcessorOptions,
	ImageProcessorResult,
} from "../../libs/image-processor/types.js";
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
	return await targetProcessor.process(context, {
		stream: data.stream,
		options: data.options,
	});
};

export default optimizeImage;
