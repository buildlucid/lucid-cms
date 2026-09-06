import { CollectionBuilder, z } from "@lucidcms/core";
import ContentBrick from "../bricks/content.js";
import SeoBrick from "../bricks/seo.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		labels: {
			singular: "Page",
			plural: "Pages",
		},
	},
	bricks: {
		fixed: [SeoBrick],
		builder: [ContentBrick],
	},
	localized: true,
	autoSave: true,
	revisions: true,
	preview: true,
	publishing: {
		targets: [
			{
				key: "production",
				label: "Production",
			},
		],
		review: {
			requiredFor: ["production"],
			allowSelfApproval: true,
		},
	},
})
	.addText("title", {
		details: {
			label: "Title",
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(96),
		},
		showInList: true,
	})
	.addTextarea("summary", {
		details: {
			label: "Summary",
		},
	});

export default PageCollection;
