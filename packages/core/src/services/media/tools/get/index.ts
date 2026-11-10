import { copy } from "../../../../libs/i18n/index.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import getMedia from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const getMediaMcpTool = () =>
	defineTool({
		name: "media_get",
		title: copy("admin:core.tools.media_get.title"),
		description:
			"Read a media library item's metadata: title, alt text, description, audio transcript, file details, folder and delivery URL.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		mcp: {
			scopes: [ExternalScopes.MediaRead],
		},
		handler: async ({ context, input }) => {
			const result = await getMedia(context, { input });
			if (result.error) throw new LucidError(result.error);
			return result.data;
		},
	}).mcp;

export const getMediaAgentTool = () =>
	defineTool({
		name: "media_get",
		title: copy("admin:core.tools.media_get.title"),
		description:
			"Read a media item's metadata: title, alt text, description, audio transcript, file details, folder and delivery URL. Works for library media and personal media of the person you act for, such as chat uploads. Values use the shape media_update accepts.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: {
			//* media access is checked when resolved, so people can read their own uploads without `media:read`
			permissions: [],
			parallelSafe: true,
		},
		handler: async ({ context, input, execution }) => {
			const result = await getMedia(context, {
				input,
				authority: execution.authority,
			});
			if (result.error) throw new LucidError(result.error);

			return {
				...result.data,
				summary: copy("admin:core.tools.media_get.summary", {
					data: { id: input.mediaId },
				}),
			};
		},
	}).agent;
