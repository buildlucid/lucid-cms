import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import defineAgentTool from "../../../../libs/tools/define-agent-tool.js";
import handler from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const removeMediaOwnershipAgentTool = () =>
	defineAgentTool({
		name: "media_remove_ownership",
		title: copy("admin:core.tools.media_remove_ownership.title"),
		description:
			"Move personal media into the shared library so it can be used in documents. Only the owner can do this. Requests approval and may make the file public.",
		input: inputSchema,
		output: outputSchema,
		permissions: [Permissions.MediaCreate],
		requiresApproval: true,
		describe: (input) =>
			copy(
				input.public
					? "admin:core.tools.media_remove_ownership.public.describe"
					: "admin:core.tools.media_remove_ownership.describe",
				{ data: { id: input.mediaId } },
			),
		handler,
	});
