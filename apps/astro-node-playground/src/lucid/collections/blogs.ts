import { defineCollection, field, z } from "@lucidcms/core";

const BlogCollection = defineCollection({
	key: "blog",
	mode: "multiple",
	details: {
		labels: {
			singular: "Blog",
			plural: "Blogs",
		},
	},
	localized: true,
	publishing: {
		environments: [
			{
				key: "production",
				label: "Production",
			},
		],
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
			useAsLabel: true,
		}),
		field.media("image", {
			details: {
				label: "Image",
			},
			localized: false,
			validation: {
				required: true,
				type: "image",
			},
			showInList: true,
		}),
	],
});

export default BlogCollection;
