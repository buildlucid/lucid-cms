import type z from "zod";
import type streamMedia from "../../../../services/media/stream.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

/** Media ID and optional inclusive byte range to read. */
export type ToolkitMediaStreamInput = z.input<typeof inputSchema>;
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
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: streamMedia } = await import(
				"../../../../services/media/stream.js"
			);

			return streamMedia(context, data);
		},
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
