import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import defineMcpTool from "../../../../libs/tools/define-mcp-tool.js";
import getMedia from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const getMediaMcpTool = () =>
	defineMcpTool({
		name: "media_get",
		title: copy("admin:core.tools.media_get.title"),
		description:
			"Read a media library item's metadata: title, alt text, description, file details, folder and delivery URL.",
		input: inputSchema,
		output: outputSchema,
		scopes: [ExternalScopes.MediaRead],
		annotations: { readOnlyHint: true },
		handler: ({ context, input }) => getMedia(context, { input }),
	});

export const getMediaAgentTool = () =>
	defineAgentTool({
		name: "media_get",
		title: copy("admin:core.tools.media_get.title"),
		description:
			"Read a media item's metadata: title, alt text, description, file details, folder and delivery URL. Works for library media and the user's personal media, such as chat uploads. Values use the shape media_update accepts.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.MediaRead],
		readOnly: true,
		parallelSafe: true,
		handler: async ({ context, input, execution }) => {
			const result = await getMedia(context, {
				input,
				authority: execution.authority,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					...result.data,
					summary: copy("admin:core.tools.media_get.summary", {
						data: { id: input.mediaId },
					}),
				},
			};
		},
	});
