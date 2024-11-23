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
	},
})
	.addText("page_title", {
		config: {
			isHidden: false,
			isDisabled: false,
		},
		collection: {
			column: true,
			filterable: true,
		},
	})
	.addTextarea("page_excerpt", {
		collection: {
			column: true,
			filterable: true,
		},
	})
	.addUser("author", {
		collection: {
			column: true,
		},
	})
	.addWysiwyg("content");

export default BlogCollection;
