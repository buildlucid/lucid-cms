import { defineCollection, field, z } from "@lucidcms/core";

export const REVIEWED_STORY_KEY = "reviewed-story";

/**
 * Stories that need an approved request to be created, published to production or moved to the
 * bin. Every setup registers it, for tests of requests.
 */
const ReviewedStoryCollection = defineCollection({
	key: REVIEWED_STORY_KEY,
	mode: "multiple",
	details: {
		labels: { singular: "Reviewed story", plural: "Reviewed stories" },
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
		//* requests can be scheduled, on setups whose queue can hold a job until its time
		scheduling: true,
		environments: [
			{ key: "staging", label: "Staging" },
			{ key: "production", label: "Production" },
		],
		review: {
			publish: ["production"],
			create: true,
			delete: true,
			selfApproval: true,
		},
	},
});

export default ReviewedStoryCollection;
