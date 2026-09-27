import { defineAgentTool, z } from "@lucidcms/core";

const noteData = z.object({
	title: z.string().trim().min(1).max(100),
	body: z.string().trim().min(1).max(1000),
});

export type NoteData = z.infer<typeof noteData>;

export const reviewNoteTool = defineAgentTool({
	name: "playground_review_note",
	title: "Review note",
	description:
		"Let the user edit a note in the composer, then pretend to save the submitted values. Stores nothing.",
	input: z.object({ title: z.string().max(100), body: z.string().max(1000) }),
	output: z.object({ saved: z.boolean(), title: z.string(), body: z.string() }),
	permissions: [],
	requiresApproval: true,
	interaction: {
		key: "playground-note-editor",
		version: 1,
		data: z.object({ title: z.string(), body: z.string() }),
		response: () => noteData,
		prepare: async ({ context, input }) => ({
			error: undefined,
			data: {
				interaction: {
					title: context.translate("server:playground.note-editor.title"),
					placement: "composer",
					data: input,
				},
			},
		}),
	},
	handler: async ({ response }) => ({
		error: undefined,
		data: {
			output: { saved: true, ...response },
			widgets: [{ key: "playground-note", version: 1, data: response }],
		},
	}),
});
