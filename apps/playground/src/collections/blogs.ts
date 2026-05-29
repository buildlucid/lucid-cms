import { CollectionBuilder, text } from "@lucidcms/core";

const BlogCollection = new CollectionBuilder("blog", {
	mode: "multiple",
	details: {
		name: text.admin("collections.blog.name", { defaultMessage: "Blogs" }),
		singularName: text.admin("collections.blog.singularName", {
			defaultMessage: "Blog",
		}),
		summary: text.admin("collections.blog.summary", {
			defaultMessage: "Manage your blogs.",
		}),
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
		localized: true,
		scheduling: true,
		environments: [
			{
				key: "staging",
				name: text.admin("collections.blog.environments.staging.name", {
					defaultMessage: "Staging",
				}),
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
