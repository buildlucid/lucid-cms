import { CollectionBuilder } from "@lucidcms/core/builders";

const BlogCollection = new CollectionBuilder("blog", {
	mode: "multiple",
	title: "Blogs",
	singular: "Blog",
	description: "Manage your blogs.",
	useTranslations: true,
})
	.addText(
		"page_title",
		{
			hidden: false,
			disabled: false,
		},
		{
			list: true,
			filterable: true,
		},
	)
	.addTextarea("page_excerpt", undefined, {
		list: true,
		filterable: true,
	})
	.addUser("author", undefined, {
		list: true,
	})
	.addWysiwyg("content");

export default BlogCollection;
