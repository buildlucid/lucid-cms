import { CollectionBuilder, copy } from "@lucidcms/core";
import RichTextCalloutBrick from "../bricks/rich-text-callout.js";

const BlogCollection = new CollectionBuilder("blog", {
	mode: "multiple",
	details: {
		name: copy("admin:collections.blog.name"),
		singularName: copy("admin:collections.blog.singularName"),
		summary: copy("admin:collections.blog.summary"),
	},
	group: {
		key: "content",
	},
	localized: true,
	scheduling: true,
	bricks: {
		embedded: [RichTextCalloutBrick],
	},
	environments: [
		{
			key: "staging",
			name: copy("admin:collections.blog.environments.staging.name"),
		},
	],
})
	.addText("slug", {
		showInList: true,
	})
	.addText("page_title", {
		ui: {
			hidden: false,
			disabled: false,
		},
		showInList: true,
	})
	.addTextarea("page_excerpt", {
		showInList: true,
	})
	.addUser("author", {
		showInList: true,
	})
	.addCheckbox("enabled")
	.addRichText("content", {
		editor: {
			links: {
				external: true,
				internal: ["page", "blog"],
			},
			media: ["image", "audio", "video"],
			variables: ["settings"],
			bricks: ["rt-callout"],
			fullscreen: true,
		},
	})
	.addRichText("seamless_content", {
		editor: {
			appearance: "seamless",
			fullscreen: true,
		},
	});

export default BlogCollection;
