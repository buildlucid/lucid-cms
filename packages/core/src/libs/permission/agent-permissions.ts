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
