import { CollectionBuilder, text, z } from "@lucidcms/core";
import ContentBrick from "../bricks/content.js";
import SeoBrick from "../bricks/seo.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: text.admin("collections.page.name", {
			defaultMessage: "Pages",
		}),
		singularName: text.admin("collections.page.singularName", {
			defaultMessage: "Page",
		}),
	},
	bricks: {
		fixed: [SeoBrick],
		builder: [ContentBrick],
	},
})
	.addText("title", {
		details: {
			label: text.admin("collections.page.fields.title.label", {
				defaultMessage: "Title",
			}),
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(96),
		},
		displayInListing: true,
	})
	.addTextarea("summary", {
		details: {
			label: text.admin("collections.page.fields.summary.label", {
				defaultMessage: "Summary",
			}),
		},
	});

export default PageCollection;
