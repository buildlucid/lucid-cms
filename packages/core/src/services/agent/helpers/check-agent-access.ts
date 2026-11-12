import { getAgent } from "../../../libs/agent/registry.js";
import type { AgentDefinition } from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { hasAgentPermission } from "../../../libs/permission/agent-permissions.js";
import type { AgentPermissionAction } from "../../../libs/permission/types.js";
import type { AgentToolAuthority } from "../../../libs/tools/types.js";
import type { LucidAuth } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveUserAccess from "../../users/resolve-access.js";

//* the agent's tools are its ceiling, so the system may use all of them
const systemAuthority: AgentToolAuthority = {
	principal: { type: "system" },
	permissions: [],
	superAdmin: true,
};

/**
 * Resolves an agent run's principal and checks its agent permission.
 * @remarks Null users act as the system; omitted actions accept any agent permission.
 */
const checkAgentAccess: ServiceFn<
	[
		{
			userId: number | null;
			/** The signed-in user. When the check is for them, their permissions aren't read again. */
			auth?: LucidAuth;
			agentKey: string;
			action?: AgentPermissionAction;
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
		const user =
			input.auth?.id === input.userId
				? {
						error: undefined,
						data: {
							superAdmin: input.auth.superAdmin,
							permissions: input.auth.permissions ?? [],
						},
					}
				: await resolveUserAccess(context, { userId: input.userId });
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

	return { error: undefined, data: { agent, authority } };
};

export default checkAgentAccess;
