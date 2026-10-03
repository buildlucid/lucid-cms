import { defineAgentTool, z } from "@lucidcms/core";

/** A pretend write: runs without input, returns a widget and stores nothing. */
export const saveNoteTool = defineAgentTool({
	name: "playground_save_note",
	title: "Save note",
	description: "Display a note in the chat as a simulated save.",
	input: z.object({ title: z.string().max(100), body: z.string().max(1000) }),
	output: z.object({ saved: z.boolean() }),
	permissions: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: {
			output: { saved: true },
			summary: `Saved "${input.title}"`,
			widgets: [{ key: "playground-note", version: 1, data: input }],
		},
	}),
});
