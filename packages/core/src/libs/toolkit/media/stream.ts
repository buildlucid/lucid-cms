import streamMedia from "../../../services/media/stream.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

/** Media ID and optional inclusive byte range to read. */
export type ToolkitMediaStreamInput = Parameters<typeof streamMedia>[1];
/** File content and metadata. */
export type ToolkitMediaStreamResult = NonNullable<
	Awaited<ReturnType<typeof streamMedia>>["data"]
>;

/** Reads an original file, including private or hidden media. */
const stream = (
	context: ServiceContext,
	input: ToolkitMediaStreamInput,
): ServiceResponse<ToolkitMediaStreamResult> =>
	runToolkitService({
		handler: () => streamMedia(context, input),
		name: {
			key: "core.toolkit.media.stream.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.stream.error.message",
			defaultMessage: "Lucid toolkit could not stream media.",
		},
	});

export default stream;
