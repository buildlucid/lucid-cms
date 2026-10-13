import { copy } from "../../../../libs/i18n/index.js";
import {
	MAX_MEDIA_BYTES,
	mediaMimeTypeSchema,
} from "../../../../libs/lucid-remote/schema/media.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import { analyzeMediaToolName } from "./constants.js";
import analyze from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

/** Answers a question about a Lucid image, audio recording or PDF with a separate analysis model. */
export const analyzeMediaAgentTool = () =>
	defineAgentTool({
		name: analyzeMediaToolName,
		title: copy("admin:core.tools.media_analyze.title"),
		description: `Analyze a Lucid image, audio recording, or PDF to answer a question. Uses a separate analysis model and Lucid credits. Maximum file size: ${MAX_MEDIA_BYTES / 1_000_000} MB.`,
		input: inputSchema,
		output: outputSchema,
		outputVersion: 1,
		//* media access is checked when resolved, so owners can analyse their own uploads without `media:read`
		permissions: [],
		readOnly: true,
		capabilities: {
			media: { analyze: { mimeTypes: mediaMimeTypeSchema.options } },
		},
		available: ({ aiAccess }) => aiAccess.includes("media_analysis"),
		handler: ({ context, input, execution }) =>
			analyze(context, { input, execution }),
	});
