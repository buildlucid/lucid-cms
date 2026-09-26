import { getAgent } from "../../../libs/agent/registry.js";
import type { AgentDefinition } from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { getAgentPermission } from "../../../libs/permission/agent-permissions.js";
import type { AgentPermissionAction } from "../../../libs/permission/types.js";
import type { AgentToolAuthority } from "../../../libs/tools/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAccessToken from "../../connection/token-manager.js";
import resolveUserAccess from "../../users/resolve-access.js";

//* the agent's tools are its ceiling, so the system may use all of them
const systemAuthority: AgentToolAuthority = {
	principal: { type: "system" },
	permissions: [],
	superAdmin: true,
};

/** Chats owned by a user need `use`; chats started by code routines need `manage`. */
export const getConversationLevel = (
	ownerId: number | null,
): AgentPermissionAction => (ownerId === null ? "manage" : "use");

/**
 * Resolves who a run acts for on one agent. A user needs the agent's permission
 * for the level and a null user acts as the system. Execution also requires a
 * usable AI connection.
 */
const checkAgentAccess: ServiceFn<
	[
		{
			userId: number | null;
			agentKey: string;
			level: AgentPermissionAction;
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
		if (
			!user.data.superAdmin &&
			!user.data.permissions.includes(
				getAgentPermission(agent.key, input.level),
			)
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

		authority = {
			principal: { type: "user", userId: input.userId },
			permissions: user.data.permissions,
			superAdmin: user.data.superAdmin,
		};
	}

	if (input.requireConnection) {
		const connection = await getAccessToken(context, {});
		if (connection.error) return connection;
	}

	return { error: undefined, data: { agent, authority } };
};

export default checkAgentAccess;
