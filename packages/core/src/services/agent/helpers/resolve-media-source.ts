import type z from "zod";
import { copy } from "../../../libs/i18n/index.js";
import {
	MAX_MEDIA_BYTES,
	type MediaMimeType,
} from "../../../libs/lucid-remote/schema/media.js";
import type { AgentToolExecution } from "../../../libs/tools/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import hasFileSignature from "./file-signature.js";
import readMedia from "./read-media.js";

/** Reads authorised media as inline base64 for a remote model, checking the bytes match the stored MIME type. */
const resolveMediaSource = async <MimeType extends MediaMimeType>(
	context: ServiceContext,
	props: {
		mediaId: number;
		mimeTypes: z.ZodEnum<{ [Key in MimeType]: Key }>;
		execution: AgentToolExecution;
	},
): ServiceResponse<{
	type: "base64";
	data: string;
	mimeType: MimeType;
	filename?: string;
}> => {
	const file = await readMedia(context, {
		...props,
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

export default resolveMediaSource;
