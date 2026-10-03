import type { LucidAgentConversations } from "../db/tables/agent-conversations.js";
import hasPermission, { type PermissionGrant } from "./has-permission.js";
import type { AgentPermission, AgentPermissionAction } from "./types.js";

export const agentPermissionActions = [
	"chat",
	"manage-own-routines",
	"manage-code-routines",
] as const satisfies AgentPermissionAction[];

export const getAgentPermission = <TAction extends AgentPermissionAction>(
	agentKey: string,
	action: TAction,
): AgentPermission<TAction> => `agents:${agentKey}:${action}`;

const conversationPermissions = {
	chat: "chat",
	"own-routine": "manage-own-routines",
	"code-routine": "manage-code-routines",
} satisfies Record<LucidAgentConversations["kind"], AgentPermissionAction>;

/** A chat keeps its workflow permission even after its routine is deleted. */
export const getConversationPermission = (
	kind: LucidAgentConversations["kind"],
): AgentPermissionAction => conversationPermissions[kind];

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
