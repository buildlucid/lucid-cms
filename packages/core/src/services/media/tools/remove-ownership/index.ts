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
			"Remove the user's ownership of their personal media, such as a file they uploaded to this chat, so it joins the shared media library and can be used in content. Personal media can't be used in documents until its ownership is removed. Only the file's owner can do this, and it asks for approval first because it can make the file public.",
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
