import { defineCollection, field, z } from "@lucidcms/core";

export const PROPOSED_STORY_KEY = "proposed-story";

/** Shared fixture requiring approved requests for both creation and changes to latest. */
const ProposedStoryCollection = defineCollection({
	key: PROPOSED_STORY_KEY,
	mode: "multiple",
	details: {
		labels: { singular: "Proposed story", plural: "Proposed stories" },
	},
	revisions: true,
	fields: [
		field.text("title", {
			validation: { required: true, zod: z.string().min(1).max(128) },
			showInList: true,
			useAsLabel: true,
		}),
		field.textarea("summary"),
	],
	publishing: {
		environments: [{ key: "production", label: "Production" }],
		review: {
			update: true,
			create: true,
			publish: ["production"],
			selfApproval: true,
		},
	},
});

export default ProposedStoryCollection;
