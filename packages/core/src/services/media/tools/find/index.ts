import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import defineMcpTool from "../../../../libs/tools/define-mcp-tool.js";
import findMedia from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const findMediaMcpTool = () =>
	defineMcpTool({
		name: "media_find",
		title: copy("admin:core.tools.media_find.title"),
		description:
			"Find media with Lucid's media filters, sorting and pagination. Returns IDs for media_preview.",
		input: inputSchema,
		output: outputSchema,
		scopes: [ExternalScopes.MediaRead],
		annotations: { readOnlyHint: true },
		handler: ({ context, input }) => findMedia(context, { input }),
	});

export const findMediaAgentTool = () =>
	defineAgentTool({
		name: "media_find",
		title: copy("admin:core.tools.media_find.title"),
		description:
			"Find media with Lucid's media filters, sorting and pagination. Returns media IDs and metadata.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.MediaRead],
		readOnly: true,
		handler: ({ context, input }) => findMedia(context, { input }),
	});
