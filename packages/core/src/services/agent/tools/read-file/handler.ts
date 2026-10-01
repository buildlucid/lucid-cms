import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { AgentToolHandler } from "../../../../libs/tools/types.js";
import readMedia from "../../helpers/read-media.js";
import register from "../../references/register.js";
import { MAX_FILE_BYTES, readFileToolName } from "./constants.js";
import decodeText from "./decode-text.js";
import extractHtml from "./extract-html.js";
import readPassages from "./read-passages.js";
import {
	fileMimeTypeSchema,
	type inputSchema,
	type outputSchema,
} from "./schema.js";

/** Reads locally and links the file to the chat. Only bounded passages enter the conversation, never the complete stored file. */
const handler: AgentToolHandler<
	z.output<typeof inputSchema>,
	z.output<typeof outputSchema>
> = async ({ context, input, execution }) => {
	const file = await readMedia(context, {
		mediaId: input.mediaId,
		execution,
		mimeTypes: fileMimeTypeSchema,
		maxBytes: MAX_FILE_BYTES,
	});
	if (file.error) return file;

	const text = decodeText(file.data.bytes);
	if (text === null) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 415,
				message: copy("server:agent.file.unreadable"),
			},
		};
	}

	const linked = await register(context, {
		conversationId: execution.run.conversationId,
		references: [{ type: "media", mediaId: input.mediaId }],
		source: { type: "tool", toolName: readFileToolName },
	});
	if (linked.error) return linked;

	const isHtml = file.data.mimeType === "text/html";

	return {
		error: undefined,
		data: {
			output: readPassages({
				text: isHtml ? extractHtml(text) : text,
				input,
				file: {
					mimeType: file.data.mimeType,
					filename: file.data.filename?.slice(0, 255),
					contentType: isHtml ? "extracted-text" : "text",
				},
			}),
		},
	};
};

export default handler;
