import { adminText, CollectionBuilder } from "@lucidcms/core";

const BlogCollection = new CollectionBuilder("blog", {
	mode: "multiple",
	details: {
		name: adminText("collections.blog.name", { fallback: "Blogs" }),
		singularName: adminText("collections.blog.singularName", {
			fallback: "Blog",
		}),
		summary: adminText("collections.blog.summary", {
			fallback: "Manage your blogs.",
		}),
	},
	config: {
		localized: true,
		environments: [
			{
				key: "staging",
				name: adminText("collections.blog.environments.staging.name", {
					fallback: "Staging",
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
