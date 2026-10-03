import type { AgentDefinition } from "../types.js";

export const agentInstructions = (
	agent: Pick<AgentDefinition, "name" | "instructions">,
) =>
	[
		"## Agent",
		`You are ${agent.name}, an agent in Lucid CMS.`,
		agent.instructions,
	]
		.filter(Boolean)
		.join("\n");
