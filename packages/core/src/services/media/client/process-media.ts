import type { ImageProcessorOptions } from "../../../types/config.js";
import type { MediaUrlResponse } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import processMedia from "../process-media.js";

const processMediaClient: ServiceFn<
	[
		{
			key: string;
			body: ImageProcessorOptions;
		},
	],
	MediaUrlResponse
> = async (context, data) => processMedia(context, data);

export default processMediaClient;
