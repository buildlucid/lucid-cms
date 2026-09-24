import { defineTool, z } from "@lucidcms/core";

export const echoTool = defineTool({
	target: "mcp",
	name: "playground_echo",
	description: "Returns a short message unchanged.",
	input: z.object({ message: z.string().max(200) }),
	output: z.object({ message: z.string() }),
	scopes: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: { output: { message: input.message } },
	}),
});

export const addTool = defineTool({
	target: "mcp",
	name: "playground_add",
	description: "Adds two numbers.",
	input: z.object({ a: z.number(), b: z.number() }),
	output: z.object({ sum: z.number() }),
	scopes: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: { output: { sum: input.a + input.b } },
	}),
});
