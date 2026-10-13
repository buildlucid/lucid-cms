/** Introduces the agent by its name in the default language. */
export const agentInstructions = (agent: {
	name: string;
	instructions: string;
}) =>
	[
		"## Agent",
		`You are ${agent.name}, an agent in Lucid CMS.`,
		agent.instructions,
	]
		.filter(Boolean)
		.join("\n");
