import type { ResolvedLucidConfig } from "../../types/config.js";
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

/** Agents are only available while AI is enabled. */
export const getAgents = (
	config: ResolvedLucidConfig,
): readonly AgentDefinition[] => (config.ai.enabled ? config.ai.agents : []);

export const getAgent = (config: ResolvedLucidConfig, key: string) =>
	getAgents(config).find((agent) => agent.key === key);
