import { getAgent } from "../../../libs/agent/registry.js";
import type { AgentDefinition } from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { hasAgentPermission } from "../../../libs/permission/agent-permissions.js";
import type { AgentPermissionAction } from "../../../libs/permission/types.js";
import type { AgentToolAuthority } from "../../../libs/tools/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkFeatureEnabled from "../../ai/checks/check-feature-enabled.js";
import getAccessToken from "../../connection/token-manager.js";
import resolveUserAccess from "../../users/resolve-access.js";

//* the agent's tools are its ceiling, so the system may use all of them
const systemAuthority: AgentToolAuthority = {
	principal: { type: "system" },
	permissions: [],
	superAdmin: true,
};

/**
 * Resolves an agent run's principal and checks its workflow permission.
 * @remarks Null users act as the system; omitted actions accept any agent permission.
 * `requireConnection` also checks the AI connection and organisation agent access.
 */
const checkAgentAccess: ServiceFn<
	[
		{
			userId: number | null;
			agentKey: string;
			action?: AgentPermissionAction;
			requireConnection?: boolean;
		},
	],
	{ agent: AgentDefinition; authority: AgentToolAuthority }
> = async (context, input) => {
	const agent = getAgent(context.config, input.agentKey);
	if (!agent) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.unavailable"),
			},
		};
	}

	let authority = systemAuthority;

	if (input.userId !== null) {
		const user = await resolveUserAccess(context, { userId: input.userId });
		if (user.error) return user;
		if (!hasAgentPermission(user.data, agent.key, input.action)) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 403,
					message: copy("server:agent.access.denied"),
				},
			};
		}

		authority = {
			principal: { type: "user", userId: input.userId },
			permissions: user.data.permissions,
			superAdmin: user.data.superAdmin,
		};
	}

	if (input.requireConnection) {
		const connection = await getAccessToken(context, {});
		if (connection.error) return connection;
		const enabled = await checkFeatureEnabled(context, { feature: "agents" });
		if (enabled.error) return enabled;
	}

	return { error: undefined, data: { agent, authority } };
};

export default checkAgentAccess;
