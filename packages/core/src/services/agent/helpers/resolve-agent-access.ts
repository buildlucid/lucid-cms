import { getAgents } from "../../../libs/agent/registry.js";
import { copy } from "../../../libs/i18n/index.js";
import { hasAgentPermission } from "../../../libs/permission/agent-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import type { AgentPermissionAction } from "../../../libs/permission/types.js";
import type { LucidAuth } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkConnectedFeature from "../../ai/checks/check-connected-feature.js";

/** Returns per-agent access, rejecting users without agent permissions or global routine oversight. */
const resolveAgentAccess: ServiceFn<
	[
		{
			auth: Pick<LucidAuth, "superAdmin" | "permissions">;
			requireConnection?: boolean;
		},
	],
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

	const grant = {
		superAdmin: input.auth.superAdmin,
		permissions: input.auth.permissions ?? [],
	};
	const keys = (action: AgentPermissionAction) =>
		agents
			.filter((agent) => hasAgentPermission(grant, agent.key, action))
			.map((agent) => agent.key);

	const access = {
		chat: keys("chat"),
		"manage-own-routines": keys("manage-own-routines"),
		"manage-code-routines": keys("manage-code-routines"),
	};
	if (
		Object.values(access).every((keys) => keys.length === 0) &&
		!hasPermission(grant, Permissions.AiRoutinesManageAll)
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
		const connected = await checkConnectedFeature(context, {
			feature: "agents",
		});
		if (connected.error) return connected;
	}

	return { error: undefined, data: access };
};

export default resolveAgentAccess;
