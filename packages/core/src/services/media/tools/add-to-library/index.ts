import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { addMediaToLibraryToolName } from "./constants.js";
import addMediaToLibrary from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const addMediaToLibraryAgentTool = () =>
	defineAgentTool({
		name: addMediaToLibraryToolName,
		title: copy("admin:core.tools.media_add_to_library.title"),
		description:
			"Add personal media to the media library so it can be used in documents. Only the person who owns it can do this. Asks them to confirm first, as it may make the file public.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.MediaCreate],
		requiresConfirmation: true,
		describe: ({ input }) =>
			copy(
				input.public
					? "admin:core.tools.media_add_to_library.public.describe"
					: "admin:core.tools.media_add_to_library.describe",
				{ data: { id: input.mediaId } },
			),
		handler: async ({ context, input, execution }) => {
			const result = await serviceWrapper(addMediaToLibrary, {
				transaction: true,
			})(context, { input, authority: execution.authority });
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					...result.data,
					changes: [{ type: "media", mediaId: input.mediaId }],
					summary: copy(
						input.public
							? "admin:core.tools.media_add_to_library.public.summary"
							: "admin:core.tools.media_add_to_library.summary",
						{ data: { id: input.mediaId } },
					),
				},
			};
		},
	});
