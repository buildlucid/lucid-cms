import { defineTool, z } from "@lucidcms/core";

const echoInput = z.object({ message: z.string().max(200) });

export const echoTool = defineTool({
	target: "mcp",
	name: "playground_echo",
	description: "Returns a short message unchanged.",
	input: echoInput,
	output: z.object({ message: z.string() }),
	scopes: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: { output: { message: input.message } },
	}),
	annotations: { readOnlyHint: true },
});

export const echoAgentTool = defineTool({
	target: "agent",
	name: "playground_echo",
	description: "Returns a short message unchanged.",
	input: echoInput,
	output: z.object({ message: z.string() }),
	permissions: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: { output: { message: input.message } },
	}),
	readOnly: true,
});
