import { defineTool, z } from "@lucidcms/core";

const addInput = z.object({ a: z.number(), b: z.number() });

export const addTool = defineTool({
	target: "mcp",
	name: "playground_add",
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

export const addAgentTool = defineTool({
	target: "agent",
	name: "playground_add",
	description: "Adds two numbers.",
	input: addInput,
	output: z.object({ sum: z.number() }),
	permissions: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: { output: { sum: input.a + input.b } },
	}),
	readOnly: true,
});
