import type { Readable } from "node:stream";
import type {
	MediaDeliveryProcessResult,
	MediaTransformationOptions,
} from "../../libs/media-delivery/types.js";
import runHandler from "../../utils/services/run-handler.js";
import type { ServiceFn } from "../../utils/services/types.js";

const optimizeImage: ServiceFn<
	[
		{
			stream: Readable;
			options: MediaTransformationOptions;
		},
	],
	MediaDeliveryProcessResult
> = async (context, data) => {
	if (!context.mediaDelivery.processImage) {
		return {
			error: undefined,
			data: { processed: false },
		};
	}

	const processImage = context.mediaDelivery.processImage.bind(
		context.mediaDelivery,
	);

	return runHandler(() =>
		processImage(context, { stream: data.stream, options: data.options }),
	);
};

export default optimizeImage;
