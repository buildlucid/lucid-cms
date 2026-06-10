import { CollectionBuilder, copy, z } from "@lucidcms/core";
import ContentBrick from "../bricks/content.js";
import SeoBrick from "../bricks/seo.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: copy("admin:collections.page.name"),
		singularName: copy("admin:collections.page.singularName"),
	},
	bricks: {
		fixed: [SeoBrick],
		builder: [ContentBrick],
	},
})
	.addText("title", {
		details: {
			label: copy("admin:collections.page.fields.title.label"),
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(96),
		},
		displayInListing: true,
	})
	.addTextarea("summary", {
		details: {
			label: copy("admin:collections.page.fields.summary.label"),
		},
	});

export default PageCollection;
