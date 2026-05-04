import { CollectionBuilder } from "@lucidcms/core";

const BlogCollection = new CollectionBuilder("blog", {
	mode: "multiple",
	details: {
		name: "Blogs",
		singularName: "Blog",
		summary: "Manage your blogs.",
	},
	permissions: {
		read: "blog:full",
		create: "blog:full",
		update: "blog:full",
		delete: "blog:full",
		restore: "blog:full",
		publish: "blog:full",
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
	.addRichText("content");

export default BlogCollection;
