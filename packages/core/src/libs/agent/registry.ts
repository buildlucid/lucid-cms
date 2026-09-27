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
export const getAgents = (config: {
	ai: Pick<ResolvedLucidConfig["ai"], "enabled" | "features" | "agents">;
}): readonly AgentDefinition[] =>
	isAiFeatureEnabled(config, "agents")
		? config.ai.agents.filter((agent) => agent.enabled)
		: [];

export const getAgent = (config: ResolvedLucidConfig, key: string) =>
	getAgents(config).find((agent) => agent.key === key);
