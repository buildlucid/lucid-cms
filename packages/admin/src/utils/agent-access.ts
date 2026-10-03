import type {
	AgentPermissionAction,
	AgentRoutine,
	AgentRoutineConversationMode,
	AgentSummary,
} from "@types";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import T, { type TranslationKeys } from "@/translations";

/** Agents available for each workflow. Reactive inside a memo or effect. */
export const getAgentAccess = () => {
	const agents = siteStore.get.ai.enabled ? siteStore.get.ai.agents : [];
	const can = (agent: AgentSummary, action: AgentPermissionAction) =>
		userStore.get.hasPermission([`agents:${agent.key}:${action}`]).all;

	return {
		all: agents.filter(
			(agent) =>
				can(agent, "chat") ||
				can(agent, "manage-own-routines") ||
				can(agent, "manage-code-routines"),
		),
		chat: agents.filter((agent) => can(agent, "chat")),
		ownRoutines: agents.filter((agent) => can(agent, "manage-own-routines")),
		codeRoutines: agents.filter((agent) => can(agent, "manage-code-routines")),
	};
};

/** An agent's display name, falling back to its key once it is removed from config. */
export const getAgentName = (key: string) =>
	siteStore.get.ai.agents.find((agent) => agent.key === key)?.name ?? key;

export const conversationModeLabels = {
	new: "agent.routine.conversation.new",
	reuse: "agent.routine.conversation.reuse",
} as const satisfies Record<AgentRoutineConversationMode, TranslationKeys>;

export type AgentUnavailableReason = "no-connection" | "connection-revoked";

/**
 * Why agents cannot run right now, or undefined when they can. Only running is
 * blocked: chats and routines can still be viewed, edited and deleted.
 */
export const getAgentUnavailableReason = ():
	| AgentUnavailableReason
	| undefined => {
	const connection = siteStore.get.connection;
	if (!connection || connection.status === "disconnected") {
		return "no-connection";
	}
	if (connection.status === "revoked") return "connection-revoked";
	return undefined;
};

/**
 * Whether a routine is paused, and why when it is only paused for the connection.
 * Display only: its `enabled` setting is kept, so it resumes once agents can run.
 */
export const getRoutinePause = (routine: Pick<AgentRoutine, "enabled">) => {
	if (!routine.enabled) return { paused: true, reason: undefined };
	return getAgentUnavailableReason()
		? { paused: true, reason: T()("agent.routine.status.unavailable") }
		: { paused: false, reason: undefined };
};
