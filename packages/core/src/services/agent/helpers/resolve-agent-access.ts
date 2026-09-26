import { getAgents } from "../../../libs/agent/registry.js";
import { copy } from "../../../libs/i18n/index.js";
import { getAgentPermission } from "../../../libs/permission/agent-permissions.js";
import type { AgentPermissionAction } from "../../../libs/permission/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAccessToken from "../../connection/token-manager.js";
import resolveUserAccess from "../../users/resolve-access.js";

/** The keys of the agents a user can use or manage, from their live permissions. Fails when there are none. */
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

	const keys = (level: AgentPermissionAction) =>
		agents
			.filter(
				(agent) =>
					user.data.superAdmin ||
					user.data.permissions.includes(getAgentPermission(agent.key, level)),
			)
			.map((agent) => agent.key);

	const access = { use: keys("use"), manage: keys("manage") };
	if (access.use.length === 0 && access.manage.length === 0) {
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
	}

	return { error: undefined, data: access };
};

export default resolveAgentAccess;
