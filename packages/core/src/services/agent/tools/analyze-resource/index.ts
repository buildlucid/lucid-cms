import { copy } from "../../../../libs/i18n/index.js";
import {
	MAX_RESOURCE_BYTES,
	resourceMimeTypeSchema,
} from "../../../../libs/lucid-remote/schema/resource.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import { analyzeResourceToolName } from "./constants.js";
import handler from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const analyzeResourceAgentTool = () =>
	defineAgentTool({
		name: analyzeResourceToolName,
		title: copy("admin:core.tools.resources_analyze.title"),
		description: `Analyse an image, PDF, audio recording, video or text file to answer a question. Use a media ID linked to this chat, or a public HTTPS URL supplied by the user or a tool. Files must be at most ${MAX_RESOURCE_BYTES / 1_000_000} MB. Uses a separate analysis model and Lucid credits; the chat model does not need vision. This returns an analysis, not direct access to the original file.`,
		input: inputSchema,
		output: outputSchema,
		permissions: [],
		requiredPermissions: (input) =>
			input.source.type === "media" ? [Permissions.MediaRead] : [],
		readOnly: true,
		capabilities: { media: { mimeTypes: resourceMimeTypeSchema.options } },
		handler,
	});
