import { CollectionBuilder } from "@lucidcms/core/builders";

const BlogCollection = new CollectionBuilder("blog", {
	mode: "multiple",
	details: {
		name: "Blogs",
		singularName: "Blog",
		summary: "Manage your blogs.",
	},
	config: {
		useTranslations: true,
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
			isHidden: false,
			isDisabled: false,
		},
		displayInListing: true,
	})
	.addTextarea("page_excerpt", {
		displayInListing: true,
	})
	.addUser("author", {
		displayInListing: true,
	})
	.addWysiwyg("content");

export default BlogCollection;
