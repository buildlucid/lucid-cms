import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import dedent from "../../../../utils/helpers/dedent.js";
import {
	FILE_PAGE_CHARS,
	MAX_FILE_BYTES,
	readFileToolName,
} from "./constants.js";
import readFile from "./handler.js";
import { fileMimeTypeSchema, inputSchema, outputSchema } from "./schema.js";

/** Reads or searches a Lucid text file in bounded passages. */
export const readFileAgentTool = () =>
	defineAgentTool({
		name: readFileToolName,
		title: copy("admin:core.tools.media_read_file.title"),
		description: dedent(`
			Read or search a Lucid text file by media ID. Supports UTF-8 and UTF-16 files up to ${MAX_FILE_BYTES / 1_000_000} MB.
			Returns up to ${FILE_PAGE_CHARS} characters per call as pages or matching excerpts, with positions and nextOffset for continuation. Results may cover only part of the file.
			HTML is returned as extracted text with links, image alt text, and table rows; positions refer to that text.
		`),
		input: inputSchema,
		output: outputSchema,
		outputVersion: 1,
		permissions: [],
		readOnly: true,
		parallelSafe: true,
		capabilities: {
			media: { readFile: { mimeTypes: fileMimeTypeSchema.options } },
		},
		handler: ({ context, input, execution }) =>
			readFile(context, { input, execution }),
	});
