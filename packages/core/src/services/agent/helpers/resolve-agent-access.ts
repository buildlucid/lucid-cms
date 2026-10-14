import { getAgents } from "../../../libs/agent/registry.js";
import { copy } from "../../../libs/i18n/index.js";
import { hasAgentPermission } from "../../../libs/permission/agent-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import type { AgentPermissionAction } from "../../../libs/permission/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkFeatureEnabled from "../../ai/checks/check-feature-enabled.js";
import getAccessToken from "../../connection/token-manager.js";
import resolveUserAccess from "../../users/resolve-access.js";

/** Returns per-agent access, rejecting users without agent permissions or global routine oversight. */
const resolveAgentAccess: ServiceFn<
	[{ userId: number; requireConnection?: boolean }],
	Record<AgentPermissionAction, string[]>
> = async (context, input) => {
	const agents = getAgents(context.config);
	if (agents.length === 0) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.disabled"),
			},
		};
	}

	const user = await resolveUserAccess(context, { userId: input.userId });
	if (user.error) return user;

	const keys = (action: AgentPermissionAction) =>
		agents
			.filter((agent) => hasAgentPermission(user.data, agent.key, action))
			.map((agent) => agent.key);

	const access = {
		chat: keys("chat"),
		"manage-own-routines": keys("manage-own-routines"),
		"manage-code-routines": keys("manage-code-routines"),
	};
	if (
		Object.values(access).every((keys) => keys.length === 0) &&
		!hasPermission(user.data, Permissions.AiRoutinesManageAll)
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.access.denied"),
			},
		};
	}

	if (input.requireConnection) {
		const connection = await getAccessToken(context, {});
		if (connection.error) return connection;
		const enabled = await checkFeatureEnabled(context, { feature: "agents" });
		if (enabled.error) return enabled;
	}

	return { error: undefined, data: access };
};

export default resolveAgentAccess;
