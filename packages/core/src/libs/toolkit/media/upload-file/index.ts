import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type {
	ToolkitMediaUploadFileInput,
	ToolkitMediaUploadFileResult,
} from "./types.js";

export type * from "./types.js";

/** Uploads a file and creates a media item, returning its ID. Defaults to private and visible. */
const uploadFile = (
	context: ServiceContext,
	input: ToolkitMediaUploadFileInput,
): ServiceResponse<ToolkitMediaUploadFileResult> =>
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
			key: "core.toolkit.media.upload-file.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.upload-file.error.message",
			defaultMessage: "Lucid toolkit could not upload media.",
		},
	});

export default uploadFile;
