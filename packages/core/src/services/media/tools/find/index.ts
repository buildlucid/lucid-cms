import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import findMedia from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const findMediaMcpTool = () =>
	defineTool({
		name: "media_find",
		title: copy("admin:core.tools.media_find.title"),
		description:
			"Find media in the library using filters, sorting, and pagination. Returns media IDs and file metadata.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		mcp: {
			scopes: [ExternalScopes.MediaRead],
		},
		handler: async ({ context, input }) => {
			const result = await findMedia(context, { input });
			if (result.error) throw new LucidError(result.error);
			return result.data;
		},
	}).mcp;

export const findMediaAgentTool = () =>
	defineTool({
		name: "media_find",
		title: copy("admin:core.tools.media_find.title"),
		description:
			"Find media in the library using filters, sorting, and pagination. Returns media IDs and file metadata.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			permissions: [Permissions.MediaRead],
			parallelSafe: true,
		},
		handler: async ({ context, input }) => {
			const result = await findMedia(context, { input });
			if (result.error) throw new LucidError(result.error);

			return {
				...result.data,
				summary: copy(
					result.data.output.data.length === 1
						? "admin:core.tools.media_find.summary.one"
						: "admin:core.tools.media_find.summary",
					{
						data: { count: result.data.output.data.length },
					},
				),
			};
		},
	}).agent;
