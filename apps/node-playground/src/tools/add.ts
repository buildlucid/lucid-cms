import { defineTool, z } from "@lucidcms/core";

export const addTool = defineTool({
	name: "playground_add",
	title: "Add numbers",
	description: "Add two numbers and return their sum.",
	input: z.object({ a: z.number(), b: z.number() }),
	output: z.object({ sum: z.number() }),
	readOnly: true,
	agent: { permissions: [] },
	mcp: { scopes: [] },
	handler: async ({ input }) => ({
		output: { sum: input.a + input.b },
		summary: `Added ${input.a} and ${input.b} to get ${input.a + input.b}`,
	}),
});
