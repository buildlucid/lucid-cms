import { defineSkill } from "@lucidcms/core";

const demoAgentSkill = defineSkill({
	name: "playground-agent-demo",
	description:
		"Test the agent: ask a question, use a tool, and report its result.",
	scopes: [],
	instructions:
		"Ask the user for two numbers using lucid_ask_user. After they answer, use playground_add and report the sum. Do not invent missing numbers.",
});

export default demoAgentSkill;
