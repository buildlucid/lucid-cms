import { copy, defineCollection, field } from "@lucidcms/core";
import RichTextCalloutBrick from "../bricks/rich-text-callout.js";

const BlogCollection = defineCollection({
	key: "blog",
	mode: "multiple",
	details: {
		labels: {
			singular: copy("admin:collections.blog.singularName"),
			plural: copy("admin:collections.blog.name"),
		},
		description: copy("admin:collections.blog.summary"),
	},
	group: {
		key: "content",
	},
	localized: true,
	bricks: {
		embedded: [RichTextCalloutBrick],
	},
	publishing: {
		environments: [
			{
				key: "staging",
				label: copy("admin:collections.blog.environments.staging.name"),
			},
			{
				key: "production",
				label: copy("admin:collections.blog.environments.production.name"),
			},
		],
		scheduling: true,
	},
	fields: [
		field.text("page_title", {
			ui: {
				hidden: false,
				disabled: false,
			},
			showInList: true,
			useAsLabel: true,
		}),
		field.textarea("page_excerpt", {
			showInList: true,
		}),
		field.user("author", {
			showInList: true,
		}),
		field.checkbox("enabled"),
		field.richText("content", {
			editor: {
				links: {
					external: true,
					internal: ["page", "blog", "route-page"],
				},
				media: true,
				documents: ["page", "settings", "blog"],
				variables: {
					document: ["settings", "page"],
					user: ["firstName", "lastName", "username"],
				},
				bricks: ["rt-callout"],
				fullscreen: true,
			},
		}),
		field.richText("seamless_content", {
			localized: false,
			editor: {
				appearance: "seamless",
				bricks: ["rt-callout"],
				fullscreen: true,
			},
		}),
	],
});

export default BlogCollection;
