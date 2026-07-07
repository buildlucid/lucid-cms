import { CollectionBuilder, copy } from "@lucidcms/core";

const BlogCollection = new CollectionBuilder("blog", {
	mode: "multiple",
	details: {
		name: copy("admin:collections.blog.name"),
		singularName: copy("admin:collections.blog.singularName"),
		summary: copy("admin:collections.blog.summary"),
	},
	permissions: {
		read: "blog:full",
		create: "blog:full",
		update: "blog:full",
		delete: "blog:full",
		restore: "blog:full",
		publish: "blog:full",
	},
	group: {
		key: "content",
	},
	localized: true,
	scheduling: true,
	environments: [
		{
			key: "staging",
			name: copy("admin:collections.blog.environments.staging.name"),
		},
	],
})
	.addText("page_title", {
		ui: {
			hidden: false,
			disabled: false,
		},
		listing: true,
	})
	.addTextarea("page_excerpt", {
		listing: true,
	})
	.addUser("author", {
		listing: true,
	})
	.addCheckbox("enabled")
	.addRichText("content");

export default BlogCollection;
