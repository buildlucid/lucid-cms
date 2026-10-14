import { getAgents } from "../../../libs/agent/registry.js";
import { copy } from "../../../libs/i18n/index.js";
import { hasAgentPermission } from "../../../libs/permission/agent-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveUserAccess from "../../users/resolve-access.js";

/** Checks agent chat access and reports whether the user can manage shared memories. */
const checkMemoryAccess: ServiceFn<
	[{ userId: number }],
	{ canManageShared: boolean }
> = async (context, input) => {
	const user = await resolveUserAccess(context, { userId: input.userId });
	if (user.error) return user;

	const canChat = getAgents(context.config).some((agent) =>
		hasAgentPermission(user.data, agent.key, "chat"),
	);
	if (!canChat) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.access.denied"),
			},
		};
	}

	return {
		error: undefined,
		data: {
			canManageShared: hasPermission(user.data, Permissions.AiMemoriesManage),
		},
	};
};

export default checkMemoryAccess;
