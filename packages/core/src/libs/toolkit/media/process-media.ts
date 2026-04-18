import { mediaServices } from "../../../services/index.js";
import type { ImageProcessorOptions } from "../../../types/config.js";
import type { MediaUrlResponse } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { normalizeQuery, runToolkitService } from "../utils.js";

export type ToolkitMediaProcessInput = {
	key: string;
	body?: ImageProcessorOptions;
};

const processMedia = async (
	context: ServiceContext,
	input: ToolkitMediaProcessInput,
): ServiceResponse<MediaUrlResponse> =>
	runToolkitService(
		() =>
			mediaServices.client.processMedia(context, {
				key: input.key,
				body: normalizeQuery(input.body),
			}),
		"Lucid toolkit could not process media.",
	);

export default processMedia;
