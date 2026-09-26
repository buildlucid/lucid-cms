import { defineTool, z } from "@lucidcms/core";

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
