import type z from "zod";
import { copy } from "../../../libs/i18n/index.js";
import readBoundedBody from "../../../libs/media-storage/read-bounded-body.js";
import type { AgentToolExecution } from "../../../libs/tools/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import streamMedia from "../../media/stream.js";
import checkReadableMedia from "./check-readable-media.js";

/** Checks media access and reads stored bytes within the tool's MIME and size limits. */
const readMedia = async <MimeType extends string>(
	context: ServiceContext,
	props: {
		mediaId: number;
		execution: AgentToolExecution;
		mimeTypes: z.ZodEnum<{ [Key in MimeType]: Key }>;
		maxBytes: number;
	},
): ServiceResponse<{
	bytes: Buffer;
	mimeType: MimeType;
	filename?: string;
}> => {
	const { mediaId, execution, maxBytes } = props;
	const checked = await checkReadableMedia(context, props);
	if (checked.error) return checked;

	const file = await streamMedia(context, { id: mediaId });
	if (file.error) return file;

	const body = await readBoundedBody(file.data.body, {
		maxBytes,
		signal: execution.signal,
	});
	if (body.type === "too-large") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 413,
				message: copy("server:agent.media.too.large", {
					data: { maxMB: maxBytes / 1_000_000 },
				}),
			},
		};
	}
	if (body.type === "aborted") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 499,
				message: copy("server:agent.media.cancelled"),
			},
		};
	}

	return {
		error: undefined,
		data: {
			bytes: body.bytes,
			mimeType: checked.data.mimeType,
			filename: file.data.fileName ?? undefined,
		},
	};
};

export default readMedia;
