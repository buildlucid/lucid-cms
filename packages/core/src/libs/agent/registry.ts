import type { ResolvedLucidConfig } from "../../types/config.js";
import { isAiFeatureEnabled } from "../config/ai-features.js";
import type { AgentDefinition, RoutineDefinition } from "./types.js";

export const isAgentDefinition = (value: unknown): value is AgentDefinition =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "agent-definition";

export const isRoutineDefinition = (
	value: unknown,
): value is RoutineDefinition =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "routine-definition";

/** The agents in use: AI and the agents feature must be on, and the agent itself enabled. */
export const getAgents = (
	config: Pick<ResolvedLucidConfig, "ai">,
): readonly AgentDefinition[] =>
	isAiFeatureEnabled(config, "agents")
		? config.ai.agents.filter((agent) => agent.enabled)
		: [];

export const getAgent = (config: ResolvedLucidConfig, key: string) =>
	getAgents(config).find((agent) => agent.key === key);

/**
 * Returns a routine's code definition, or undefined for user routines, removed keys and disabled
 * agents.
 */
export const getRoutineDefinition = (
	config: Pick<ResolvedLucidConfig, "ai">,
	routine: { agent_key: string; key: string | null },
) =>
	routine.key === null
		? undefined
		: config.ai.agents
				.find((agent) => agent.key === routine.agent_key)
				?.routines.find((definition) => definition.key === routine.key);
