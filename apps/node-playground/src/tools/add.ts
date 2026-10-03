import { defineAgentTool, defineMcpTool, z } from "@lucidcms/core";

const addInput = z.object({ a: z.number(), b: z.number() });

export const addTool = defineMcpTool({
	name: "playground_add",
	title: "Add numbers",
	description: "Adds two numbers.",
	input: addInput,
	output: z.object({ sum: z.number() }),
	scopes: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: { output: { sum: input.a + input.b } },
	}),
	annotations: { readOnlyHint: true },
});

export const addAgentTool = defineAgentTool({
	name: "playground_add",
	title: "Add numbers",
	description: "Adds two numbers.",
	input: addInput,
	output: z.object({ sum: z.number() }),
	permissions: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: {
			output: { sum: input.a + input.b },
			summary: `Added ${input.a} and ${input.b} to get ${input.a + input.b}`,
		},
	}),
	readOnly: true,
});
