import { MAX_MEDIA_BYTES } from "../../../../libs/lucid-remote/schema/media.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import checkReadableMedia from "../../helpers/check-readable-media.js";
import { editableImageMimeTypeSchema } from "../generate-image/schema.js";
import checkSourceKnown from "./check-source-known.js";

/** Checks source access and context before review and execution, including routines that skip review. */
const checkSource: ServiceFn<
	[{ mediaId: number; execution: AgentToolExecution }],
	undefined
> = async (context, { mediaId, execution }) => {
	const readable = await checkReadableMedia(context, {
		mediaId,
		execution,
		mimeTypes: editableImageMimeTypeSchema,
		maxBytes: MAX_MEDIA_BYTES,
	});
	if (readable.error) return readable;

	return checkSourceKnown(context, {
		mediaId,
		mimeType: readable.data.mimeType,
		execution,
	});
};

export default checkSource;
