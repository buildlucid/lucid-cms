import { copy } from "../../../../libs/i18n/index.js";
import {
	MAX_MEDIA_BYTES,
	mediaMimeTypeSchema,
} from "../../../../libs/lucid-remote/schema/media.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import { analyzeMediaToolName } from "./constants.js";
import analyze from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

/** Answers a question about a Lucid image, audio recording or PDF with a separate analysis model. */
export const analyzeMediaAgentTool = () =>
	defineTool({
		name: analyzeMediaToolName,
		title: copy("admin:core.tools.media_analyze.title"),
		description: `Analyze a Lucid image, audio recording, or PDF to answer a question. Uses a separate analysis model and Lucid credits. Maximum file size: ${MAX_MEDIA_BYTES / 1_000_000} MB.`,
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			outputVersion: 1,
			//* media access is checked when resolved, so owners can analyse their own uploads without `media:read`
			permissions: [],
			capabilities: {
				media: { analyze: { mimeTypes: mediaMimeTypeSchema.options } },
			},
			available: ({ aiAccess }) => aiAccess.includes("media_analysis"),
		},
		handler: async ({ context, input, execution }) => {
			const result = await analyze(context, { input, execution });
			if (result.error) throw new LucidError(result.error);
			return result.data;
		},
	}).agent;
