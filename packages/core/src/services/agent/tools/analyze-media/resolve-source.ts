import { copy } from "../../../../libs/i18n/index.js";
import {
	MAX_MEDIA_BYTES,
	type MediaSource,
	mediaMimeTypeSchema,
} from "../../../../libs/lucid-remote/schema/media.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import readMedia from "../../helpers/read-media.js";
import hasFileSignature from "./file-signature.js";

/** Resolves authorised media as inline data for the remote analysis model. */
const resolveSource: ServiceFn<
	[{ mediaId: number; execution: AgentToolExecution }],
	MediaSource
> = async (context, props) => {
	const file = await readMedia(context, {
		...props,
		mimeTypes: mediaMimeTypeSchema,
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
