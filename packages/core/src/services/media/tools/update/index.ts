import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import type { AgentLucidToolName } from "../../../../types/response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import updateMedia from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

const name = "media_update" satisfies AgentLucidToolName;

export const updateMediaAgentTool = () =>
	defineAgentTool({
		name,
		title: copy("admin:core.tools.media_update.title"),
		description:
			"Update a media item's title, alt text, description or summary in one content language, or its file name and folder. Send only what changes. Works for library media and the user's personal media, which can't go in folders.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.MediaUpdate],
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
					summary: copy("admin:core.tools.media_update.summary", {
						data: { id: input.mediaId },
					}),
				},
			};
		},
	});
