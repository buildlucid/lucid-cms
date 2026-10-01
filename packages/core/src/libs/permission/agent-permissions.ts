import hasPermission, { type PermissionGrant } from "./has-permission.js";
import type { AgentPermission, AgentPermissionAction } from "./types.js";

export const agentPermissionActions = [
	"use",
	"manage",
] as const satisfies AgentPermissionAction[];

/** Builds the permission for one action on a registered agent. `manage` covers its code-defined routines. */
export const getAgentPermission = <TAction extends AgentPermissionAction>(
	agentKey: string,
	action: TAction,
): AgentPermission<TAction> => `agents:${agentKey}:${action}`;

/** Chats owned by a user need `use`; chats started by code routines need `manage`. */
export const getConversationLevel = (
	ownerId: number | null,
): AgentPermissionAction => (ownerId === null ? "manage" : "use");

export const hasAgentPermission = (
	grant: PermissionGrant,
	agentKey: string,
	level: AgentPermissionAction,
) => hasPermission(grant, getAgentPermission(agentKey, level));
