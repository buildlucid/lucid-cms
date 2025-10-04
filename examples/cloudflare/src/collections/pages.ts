import { z, CollectionBuilder } from "@lucidcms/core";
import SeoBrick from "../bricks/seo.js";
import TextareaBrick from "../bricks/textarea.js";
import HeroBrick from "../bricks/hero.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: "Pages",
		singularName: "Page",
		summary: "Manage the pages and content on your website.",
	},
	config: {
		useTranslations: true,
		useDrafts: true,
		useRevisions: true,
		useAutoSave: true,
	},
	bricks: {
		fixed: [SeoBrick],
		builder: [HeroBrick, TextareaBrick],
	},
})
	.addText("title", {
		details: {
			label: "Page title",
			summary: "The title of the page.",
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(128),
		},
		displayInListing: true,
	})
	.addUser("author", {
		displayInListing: true,
	});

export default PageCollection;
