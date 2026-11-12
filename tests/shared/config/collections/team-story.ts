import { defineCollection, field, z } from "@lucidcms/core";

export const TEAM_STORY_KEY = "team-story";

/**
 * Shared request fixture requiring two approvals and excluding author approval. Production
 * publishing requires matching content in staging.
 */
const TeamStoryCollection = defineCollection({
	key: TEAM_STORY_KEY,
	mode: "multiple",
	details: {
		labels: { singular: "Team story", plural: "Team stories" },
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
		environments: [
			{ key: "staging", label: "Staging" },
			{ key: "production", label: "Production", requires: ["staging"] },
		],
		review: {
			publish: ["production"],
			create: true,
			delete: true,
			approvals: 2,
		},
	},
});

export default TeamStoryCollection;
