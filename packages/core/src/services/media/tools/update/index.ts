import { copy } from "../../../../libs/i18n/index.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import updateMedia from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "media_update";

export const updateMediaAgentTool = () =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.media_update.title"),
		description:
			"Update a media item's title, alt text, description, summary or audio transcript in one content language, or its file name and folder. Send only the fields that change, and list any to remove in clear. Works for library media and personal media of the person you act for, which can't go in folders. Changes are saved straight away.",
		input: inputSchema,
		output: outputSchema,
		//* library media needs `media:update`, checked by the handler, so people can update their own uploads without it
		permissions: [],
		requiresConfirmation: true,
		describe: (input) =>
			copy("admin:core.tools.media_update.describe", {
				data: { id: input.mediaId },
			}),
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(updateMedia, {
				transaction: true,
			})(context, {
				input,
				actor: execution.actor,
				authority: execution.authority,
				conversationId: execution.run.conversationId,
				toolName: name,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					...result.data,
					changes: [{ type: "media", mediaId: input.mediaId }],
					summary: copy("admin:core.tools.media_update.summary", {
						data: { id: input.mediaId },
					}),
				},
			};
		},
	});
