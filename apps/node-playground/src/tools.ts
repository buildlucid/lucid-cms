import { defineSkill, defineTool, z } from "@lucidcms/core";

const echoInput = z.object({ message: z.string().max(200) });
const echo = {
	name: "playground_echo",
	description: "Returns a short message unchanged.",
	input: echoInput,
	output: z.object({ message: z.string() }),
	handler: async ({ input }: { input: z.output<typeof echoInput> }) => ({
		error: undefined,
		data: { output: { message: input.message } },
	}),
};

export const echoTool = defineTool({
	...echo,
	target: "mcp",
	scopes: [],
	annotations: { readOnlyHint: true },
});
export const echoAgentTool = defineTool({
	...echo,
	target: "agent",
	permissions: [],
	readOnly: true,
});

const addInput = z.object({ a: z.number(), b: z.number() });
const add = {
	name: "playground_add",
	description: "Adds two numbers.",
	input: addInput,
	output: z.object({ sum: z.number() }),
	handler: async ({ input }: { input: z.output<typeof addInput> }) => ({
		error: undefined,
		data: { output: { sum: input.a + input.b } },
	}),
};

export const addTool = defineTool({
	...add,
	target: "mcp",
	scopes: [],
	annotations: { readOnlyHint: true },
});
export const addAgentTool = defineTool({
	...add,
	target: "agent",
	permissions: [],
	readOnly: true,
});

/** A pretend write: it needs approval and returns a widget, but stores nothing. */
export const saveNoteTool = defineTool({
	target: "agent",
	name: "playground_save_note",
	description: "Saves a short note for the user.",
	input: z.object({ title: z.string().max(100), body: z.string().max(1000) }),
	output: z.object({ saved: z.boolean() }),
	permissions: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: {
			output: { saved: true },
			widgets: [{ key: "playground-note", version: 1, data: input }],
		},
	}),
});

export const demoAgentSkill = defineSkill({
	target: "agent",
	name: "playground-agent-demo",
	description:
		"Test the agent: ask a question, use a tool, and report its result.",
	scopes: [],
	instructions:
		"Ask the user for two numbers using lucid_ask_user. After they answer, use playground_add and report the sum. Do not invent missing numbers.",
});
