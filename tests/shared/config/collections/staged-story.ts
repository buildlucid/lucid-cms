import { defineCollection, field, z } from "@lucidcms/core";

export const STAGED_STORY_KEY = "staged-story";

/** The stages a staged story moves through. Only `ready` lets it reach latest or an environment. */
export const STAGES = {
	draft: "draft",
	review: "review",
	ready: "ready",
} as const;

/**
 * Shared workflow fixture. Creation and publishing require `ready`, which resets to `review` after
 * content changes.
 */
const StagedStoryCollection = defineCollection({
	key: STAGED_STORY_KEY,
	mode: "multiple",
	details: {
		labels: { singular: "Staged story", plural: "Staged stories" },
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
			{ key: "production", label: "Production" },
		],
		review: {
			publish: ["production"],
			create: true,
			selfApproval: true,
		},
		workflow: {
			initial: STAGES.draft,
			stages: [
				{ key: STAGES.draft, label: "Draft" },
				{ key: STAGES.review, label: "Review" },
				{
					key: STAGES.ready,
					label: "Ready",
					targets: ["latest", "staging", "production"],
					resetTo: STAGES.review,
				},
			],
		},
	},
});

export default StagedStoryCollection;
