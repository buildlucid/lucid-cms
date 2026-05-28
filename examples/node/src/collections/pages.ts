import { adminText, CollectionBuilder, z } from "@lucidcms/core";
import ContentBrick from "../bricks/content.js";
import SeoBrick from "../bricks/seo.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: adminText("collections.page.name", {
			fallback: "Pages",
		}),
		singularName: adminText("collections.page.singularName", {
			fallback: "Page",
		}),
	},
	bricks: {
		fixed: [SeoBrick],
		builder: [ContentBrick],
	},
})
	.addText("title", {
		details: {
			label: adminText("collections.page.fields.title.label", {
				fallback: "Title",
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
			label: adminText("collections.page.fields.summary.label", {
				fallback: "Summary",
			}),
		},
	});

export default PageCollection;
