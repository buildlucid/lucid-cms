import { CollectionBuilder } from "@lucidcms/core";

const BlogCollection = new CollectionBuilder("blog", {
	mode: "multiple",
	details: {
		name: "Blogs",
		singularName: "Blog",
		summary: "Manage your blogs.",
	},
	config: {
		translations: true,
		environments: [
			{
				key: "staging",
				name: "Staging",
			},
		],
	},
})
	.addText("page_title", {
		config: {
			hidden: false,
			disabled: false,
		},
		displayInListing: true,
	})
	.addTextarea("page_excerpt", {
		displayInListing: true,
	})
	.addUser("author", {
		displayInListing: true,
	})
	.addRichText("content");

export default BlogCollection;
