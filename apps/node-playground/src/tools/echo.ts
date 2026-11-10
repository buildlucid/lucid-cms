import { defineTool, z } from "@lucidcms/core";

export const echoTool = defineTool({
	name: "playground_echo",
	title: "Echo",
	description: "Return the supplied message unchanged.",
	input: z.object({ message: z.string().max(200) }),
	output: z.object({ message: z.string() }),
	readOnly: true,
	agent: { permissions: [] },
	mcp: { scopes: [] },
	handler: async ({ input }) => ({
		output: { message: input.message },
		summary: `Echoed "${input.message}"`,
	}),
});
