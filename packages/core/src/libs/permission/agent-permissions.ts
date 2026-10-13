import type { LucidAgentConversations } from "../db/tables/agent-conversations.js";
import hasPermission, { type PermissionGrant } from "./has-permission.js";
import type { AgentPermission, AgentPermissionAction } from "./types.js";

/** Every action a role can be granted on an agent, and the source of `AgentPermissionAction`. */
export const agentPermissionActions = [
	"chat",
	"manage-own-routines",
	"manage-code-routines",
] as const;

/** Builds an agent permission key, eg. `agents:writer:chat`. */
export const getAgentPermission = <TAction extends AgentPermissionAction>(
	agentKey: string,
	action: TAction,
): AgentPermission<TAction> => `agents:${agentKey}:${action}`;

const conversationPermissions = {
	chat: "chat",
	"own-routine": "manage-own-routines",
	"code-routine": "manage-code-routines",
} satisfies Record<LucidAgentConversations["kind"], AgentPermissionAction>;

/** Agent action required by a chat's kind, retained after routine deletion. */
export const getConversationPermission = (
	kind: LucidAgentConversations["kind"],
): AgentPermissionAction => conversationPermissions[kind];

/** Checks one agent action, or any agent action when none is given. */
export const hasAgentPermission = (
	grant: PermissionGrant,
	agentKey: string,
	action?: AgentPermissionAction,
) =>
	action
		? hasPermission(grant, getAgentPermission(agentKey, action))
		: agentPermissionActions.some((action) =>
				hasPermission(grant, getAgentPermission(agentKey, action)),
			);
