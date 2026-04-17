import { CollectionBuilder, z } from "@lucidcms/core";

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
	.addRichText("page_body", {
		details: {
			label: {
				en: "Page body",
			},
			summary: "A short body copy block rendered in the Astro page examples.",
		},
		validation: {
			required: true,
		},
	})
	.addMedia("thumbnail", {
		details: {
			label: {
				en: "Thumbnail",
			},
		},
		validation: {
			required: true,
		},
	});

export default PagesCollection;
