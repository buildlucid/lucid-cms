import { CollectionBuilder, z } from "@lucidcms/core";

const BlogCollection = new CollectionBuilder("blog", {
	mode: "multiple",
	details: {
		name: "Blogs",
		singularName: "Blog",
	},
	localized: true,
	environments: [
		{
			key: "production",
			name: "Production",
		},
	],
})
	.addText("title", {
		details: {
			label: "Title",
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(96),
		},
		showInList: true,
		useAsLabel: true,
	})
	.addMedia("image", {
		details: {
			label: "Image",
		},
		localized: false,
		validation: {
			required: true,
			type: "image",
		},
		showInList: true,
	});

export default BlogCollection;
