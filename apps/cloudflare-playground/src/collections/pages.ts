import { defineCollection, field, z } from "@lucidcms/core";
import ContentBrick from "../bricks/content.js";
import SeoBrick from "../bricks/seo.js";

const PageCollection = defineCollection({
	key: "page",
	mode: "multiple",
	details: {
		labels: {
			singular: "Page",
			plural: "Pages",
		},
	},
	bricks: {
		fixed: [SeoBrick],
		builder: [ContentBrick],
	},
	fields: [
		field.text("title", {
			details: {
				label: "Title",
			},
			validation: {
				required: true,
				zod: z.string().min(2).max(96),
			},
			showInList: true,
		}),
		field.textarea("summary", {
			details: {
				label: "Summary",
			},
		}),
	],
});

export default PageCollection;
