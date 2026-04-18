import { mediaServices } from "../../../services/index.js";
import type { MediaResponse } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

export type ToolkitMediaGetSingleInput = {
	id: number;
};

const getSingle = async (
	context: ServiceContext,
	input: ToolkitMediaGetSingleInput,
): ServiceResponse<MediaResponse> =>
	runToolkitService(
		() => mediaServices.client.getSingle(context, input),
		"Lucid toolkit could not fetch a media item.",
	);

export default getSingle;
