import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import handler from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const addMediaToLibraryAgentTool = () =>
	defineAgentTool({
		name: "media_add_to_library",
		title: copy("admin:core.tools.media_add_to_library.title"),
		description:
			"Add personal media to the shared library so it can be used in documents. Only the person who owns it can do this. Asks them to confirm first, as it may make the file public.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.MediaCreate],
		requiresConfirmation: true,
		describe: (input) =>
			copy(
				input.public
					? "admin:core.tools.media_add_to_library.public.describe"
					: "admin:core.tools.media_add_to_library.describe",
				{ data: { id: input.mediaId } },
			),
		handler,
	});
