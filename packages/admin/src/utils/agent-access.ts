import type {
	AgentPermissionAction,
	AgentRoutine,
	AgentRoutineConversationMode,
	AgentSummary,
} from "@types";
import siteStore from "@/store/siteStore/siteStore";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import userStore from "@/store/userStore/userStore";
import T, { type TranslationKeys } from "@/translations";

/**
 * Returns workflow access for available agents, excluding them when AI features are hidden.
 * @remarks Read inside a memo or effect to track changes.
 */
export const getAgentAccess = () => {
	const agents =
		siteStore.get.ai.enabled && !userPreferencesStore.getAiHidden()
			? siteStore.get.ai.agents
			: [];
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
		/** Agents offered in the sidebar beside admin pages. */
		sidebar: agents.filter((agent) => agent.sidebar && can(agent, "chat")),
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

export type AgentUnavailableReason =
	| "no-connection"
	| "connection-revoked"
	| "organisation-disabled";

const routinePauseReasons = {
	"no-connection": "agent.routine.status.unavailable",
	"connection-revoked": "agent.routine.status.unavailable",
	"organisation-disabled": "agent.routine.status.organisation-disabled",
} as const satisfies Record<AgentUnavailableReason, TranslationKeys>;

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
	if (connection.ai && !connection.ai.features.includes("agent")) {
		return "organisation-disabled";
	}
	return undefined;
};

/**
 * Returns a routine's displayed pause state and agent availability reason.
 * @remarks Preserves `enabled`, allowing routines to resume when agent access returns.
 */
export const getRoutinePause = (routine: Pick<AgentRoutine, "enabled">) => {
	if (!routine.enabled) return { paused: true, reason: undefined };
	const unavailable = getAgentUnavailableReason();
	return unavailable
		? { paused: true, reason: T()(routinePauseReasons[unavailable]) }
		: { paused: false, reason: undefined };
};
