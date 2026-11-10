import { defineCollection, field, z } from "@lucidcms/core";

/** Plain pages with revisions, which every setup registers so tests can rely on them. */
const PageCollection = defineCollection({
	key: "page",
	mode: "multiple",
	details: {
		labels: { singular: "Page", plural: "Pages" },
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
});

export default PageCollection;
