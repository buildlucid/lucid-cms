import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type {
	ToolkitMediaReplaceFileInput,
	ToolkitMediaReplaceFileResult,
} from "./types.js";

export type * from "./types.js";

/** Replaces a file and its filename, preserving the media ID, text, folder and visibility. Old file metadata is refreshed or cleared. */
const replaceFile = (
	context: ServiceContext,
	input: ToolkitMediaReplaceFileInput,
): ServiceResponse<ToolkitMediaReplaceFileResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: uploadMedia } = await import(
				"../../../../services/media/upload-single.js"
			);

			return uploadMedia(context, data);
		},
		name: {
			key: "core.toolkit.media.replace-file.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.replace-file.error.message",
			defaultMessage: "Lucid toolkit could not replace the media file.",
		},
	});

export default replaceFile;
