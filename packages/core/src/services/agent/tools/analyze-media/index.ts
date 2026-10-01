import { copy } from "../../../../libs/i18n/index.js";
import {
	MAX_MEDIA_BYTES,
	mediaMimeTypeSchema,
} from "../../../../libs/lucid-remote/schema/media.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import { analyzeMediaToolName } from "./constants.js";
import handler from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const analyzeMediaAgentTool = () =>
	defineAgentTool({
		name: analyzeMediaToolName,
		title: copy("admin:core.tools.media_analyze.title"),
		description: `Analyse an image, PDF, audio recording, video or text file to answer a question. Use a media ID linked to this chat, or a public HTTPS URL supplied by the user or a tool. Files must be at most ${MAX_MEDIA_BYTES / 1_000_000} MB. Uses a separate analysis model and Lucid credits; the chat model does not need vision. This returns an analysis, not direct access to the original file.`,
		input: inputSchema,
		output: outputSchema,
		//* linked media is checked when resolved, so owners can analyse their own uploads without `media:read`
		permissions: [],
		readOnly: true,
		capabilities: { media: { mimeTypes: mediaMimeTypeSchema.options } },
		handler,
	});
