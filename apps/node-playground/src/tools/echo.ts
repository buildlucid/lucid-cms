import { defineAgentTool, defineMcpTool, z } from "@lucidcms/core";

const echoInput = z.object({ message: z.string().max(200) });

export const echoTool = defineMcpTool({
	name: "playground_echo",
	title: "Echo",
	description: "Return the supplied message unchanged.",
	input: echoInput,
	output: z.object({ message: z.string() }),
	scopes: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: { output: { message: input.message } },
	}),
	annotations: { readOnlyHint: true },
});

export const echoAgentTool = defineAgentTool({
	name: "playground_echo",
	title: "Echo",
	description: "Return the supplied message unchanged.",
	input: echoInput,
	output: z.object({ message: z.string() }),
	permissions: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: {
			output: { message: input.message },
			summary: `Echoed "${input.message}"`,
		},
	}),
	readOnly: true,
});
