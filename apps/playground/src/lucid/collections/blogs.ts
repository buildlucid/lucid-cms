import { CollectionBuilder } from "@lucidcms/core/builders";

const BlogCollection = new CollectionBuilder("blog", {
	mode: "multiple",
	title: "Blogs",
	singular: "Blog",
	description: "Manage your blogs.",
	useTranslations: true,
})
	.addText("page_title", {
		hidden: false,
		disabled: false,
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
