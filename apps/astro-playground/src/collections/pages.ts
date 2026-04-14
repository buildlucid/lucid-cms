import { z } from "@lucidcms/core";
import { CollectionBuilder } from "@lucidcms/core/builders";

const PagesCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: "Pages",
		singularName: {
			en: "Page",
		},
		summary: "Simple website pages for the Astro Lucid playground.",
	},
	config: {
		useTranslations: false,
		useRevisions: false,
		useAutoSave: false,
	},
})
	.addText("page_title", {
		details: {
			label: {
				en: "Page title",
			},
			summary: "The public title rendered by the Astro routes.",
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(120),
		},
		displayInListing: true,
	})
	.addTextarea("page_body", {
		details: {
			label: {
				en: "Page body",
			},
			summary: "A short body copy block rendered in the Astro page examples.",
		},
		validation: {
			required: true,
			zod: z.string().min(8).max(2000),
		},
	});

export default PagesCollection;
