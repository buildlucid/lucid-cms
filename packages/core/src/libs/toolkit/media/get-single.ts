import { mediaServices } from "../../../services/index.js";
import type { Media } from "../../../types/response.js";
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
): ServiceResponse<Media> =>
	runToolkitService(() => mediaServices.client.getSingle(context, input), {
		name: {
			key: "core.toolkit.media.get.single.error.name",
			fallback: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.get.single.error.message",
			fallback: "Lucid toolkit could not fetch a media item.",
		},
	});

export default getSingle;
