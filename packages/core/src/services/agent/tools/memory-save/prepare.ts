import type z from "zod";
import constants from "../../../../constants/constants.js";
import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import hasPermission from "../../../../libs/permission/has-permission.js";
import type {
	AgentToolAuthority,
	AgentToolInteraction,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import checkMemoryCapacity from "../../helpers/check-memory-capacity.js";
import checkMemoryScope from "../../helpers/check-memory-scope.js";
import getEditableMemories from "../../helpers/get-editable-memories.js";
import getMemoryScopes from "../../helpers/get-memory-scopes.js";
import type { inputSchema, reviewDataSchema } from "./schema.js";

/** Checks scope, access and capacity before preparing the memory review widget. */
const prepareMemoryReview: ServiceFn<
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
	const { userId } = authority.principal;
	const canManageShared = hasPermission(
		authority,
		Permissions.AiMemoriesManage,
	);

	const scope = await checkMemoryScope(context, {
		scope: input.scope,
		canManageShared,
	});
	if (scope.error) return scope;

	const replaced = await getEditableMemories(context, {
		userId,
		ids: input.replaces,
		canManageShared,
	});
	if (replaced.error) return replaced;

	const capacity = await checkMemoryCapacity(context, {
		userId,
		scope: input.scope,
		replaced: replaced.data,
	});
	if (capacity.error) return capacity;

	return {
		error: undefined,
		data: {
			interaction: {
				title: copy("admin:core.tools.lucid_memory_save.review.title"),
				placement: "composer",
				data: {
					action: "save",
					content: input.content,
					scope: input.scope,
					scopes: getMemoryScopes(context.config, canManageShared),
					contentChars: constants.agent.memory.contentChars,
					replaces: replaced.data.map((memory) => ({
						id: memory.id,
						scope: memory.owner_user_id === null ? "shared" : "personal",
						content: memory.content,
					})),
				},
			},
		},
	};
};

export default prepareMemoryReview;
