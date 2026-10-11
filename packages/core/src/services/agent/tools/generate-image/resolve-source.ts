import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import { MAX_MEDIA_BYTES } from "../../../../libs/lucid-remote/schema/media.js";
import type { CmsAiGenerateRequestInputImage } from "../../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import hasFileSignature from "../../helpers/file-signature.js";
import readMedia from "../../helpers/read-media.js";
import type { editableImageMimeTypeSchema } from "./schema.js";

type SourceImage = CmsAiGenerateRequestInputImage<
	"source-image",
	z.output<typeof editableImageMimeTypeSchema>
>["image"];

/** Resolves an authorised Lucid image as inline data for the generation model to build on. */
const resolveSource: ServiceFn<
	[
		{
			mediaId: number;
			mimeTypes: typeof editableImageMimeTypeSchema;
			execution: AgentToolExecution;
		},
	],
	SourceImage
> = async (context, props) => {
	const file = await readMedia(context, {
		mediaId: props.mediaId,
		execution: props.execution,
		mimeTypes: props.mimeTypes,
		maxBytes: MAX_MEDIA_BYTES,
	});
	if (file.error) return file;

	if (!hasFileSignature(file.data.bytes, file.data.mimeType)) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 415,
				message: copy("server:agent.media.mismatch"),
			},
		};
	}

	return {
		error: undefined,
		data: {
			type: "base64",
			data: file.data.bytes.toString("base64"),
			mimeType: file.data.mimeType,
			filename: file.data.filename,
		},
	};
};

export default resolveSource;
