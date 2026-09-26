import { Permissions } from "../../../../libs/permission/definitions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import findMedia from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const findMediaMcpTool = defineTool({
	target: "mcp",
	name: "media_find",
	description:
		"Find media with Lucid's media filters, sorting and pagination. Returns IDs for media_preview.",
	input: inputSchema,
	output: outputSchema,
	scopes: [ExternalScopes.MediaRead],
	annotations: { readOnlyHint: true },
	handler: ({ context, input }) => findMedia(context, { input }),
});

export const findMediaAgentTool = defineTool({
	target: "agent",
	name: "media_find",
	description:
		"Find media with Lucid's media filters, sorting and pagination. Returns media IDs and metadata.",
	input: inputSchema,
	output: outputSchema,
	permissions: [Permissions.MediaRead],
	readOnly: true,
	handler: ({ context, input }) => findMedia(context, { input }),
});
