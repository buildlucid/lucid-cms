import { z, CollectionBuilder } from "@lucidcms/core";
import SeoBrick from "../bricks/seo.js";
import TextareaBrick from "../bricks/textarea.js";

const NewsCollection = new CollectionBuilder("news", {
	mode: "multiple",
	details: {
		name: "News",
		singularName: "News",
		summary: "Manage your websites news articles.",
	},
	config: {
		useTranslations: true,
		useDrafts: true,
		useRevisions: true,
		useAutoSave: false,
	},
	bricks: {
		fixed: [SeoBrick],
		builder: [TextareaBrick],
	},
})
	.addText("title", {
		details: {
			label: "News title",
			summary: "The title of the news article.",
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(128),
		},
		displayInListing: true,
	})
	.addUser("author", {
		displayInListing: true,
	})
	.addTextarea("excerpt", {
		details: {
			label: "Excerpt",
		},
		validation: {
			required: true,
		},
	})
	.addMedia("thumbnail", {
		details: {
			label: "Thumbnail",
		},
		validation: {
			type: "image",
		},
	});

export default NewsCollection;
