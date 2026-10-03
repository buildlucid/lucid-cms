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
			"Find media in the library with optional filters, sorting and pagination. Only include filters needed for the search; unused columns must be omitted. Returns IDs for media_preview.",
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
			"Find media in the library with optional filters, sorting and pagination. Only include filters needed for the search; unused columns must be omitted. Returns media IDs and metadata for analysis or previews.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.MediaRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input }) => {
			const result = await findMedia(context, { input });
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					...result.data,
					summary: copy(
						result.data.output.data.length === 1
							? "admin:core.tools.media_find.summary.one"
							: "admin:core.tools.media_find.summary",
						{
							data: { count: result.data.output.data.length },
						},
					),
				},
			};
		},
	});
