import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import hasPermission from "../../../../libs/permission/has-permission.js";
import type {
	AgentToolAuthority,
	AgentToolInteraction,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getEditableMemories from "../../helpers/get-editable-memories.js";
import type { inputSchema, reviewDataSchema } from "./schema.js";

/** Checks deletion access and prepares the memory confirmation widget. */
const prepareMemoryDelete: ServiceFn<
	[{ input: z.output<typeof inputSchema>; authority: AgentToolAuthority }],
	AgentToolInteraction<z.input<typeof reviewDataSchema>>
> = async (context, props) => {
	const { input, authority } = props;
	if (authority.principal.type !== "user") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.tool.unavailable"),
			},
		};
	}

	const memories = await getEditableMemories(context, {
		userId: authority.principal.userId,
		ids: input.memoryIds,
		canManageShared: hasPermission(authority, Permissions.AiMemoriesManage),
	});
	if (memories.error) return memories;

	return {
		error: undefined,
		data: {
			interaction: {
				title: copy("admin:core.tools.lucid_memory_delete.review.title"),
				placement: "composer",
				data: {
					action: "delete",
					memories: memories.data.map((memory) => ({
						id: memory.id,
						scope: memory.owner_user_id === null ? "shared" : "personal",
						content: memory.content,
					})),
				},
			},
		},
	};
};

export default prepareMemoryDelete;
