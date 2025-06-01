import { z } from "@lucidcms/core";
import { CollectionBuilder } from "@lucidcms/core/builders";
import SEOBrick from "../bricks/seo.js";

const SettingsCollection = new CollectionBuilder("settings", {
	mode: "single",
	details: {
		name: "Settings",
		singularName: "Setting",
		summary: "Set shared settings for your website.",
	},
	config: {
		useRevisions: true,
	},
	bricks: {
		fixed: [SEOBrick],
	},
})
	.addText("site_title", {
		details: {
			label: "Site Title",
		},
	})
	.addMedia("site_logo", {
		details: {
			label: "Site Logo",
		},
	})
	.addRepeater("social_links", {
		details: {
			label: "Social Links",
		},
	})
	.addText("social_name", {
		details: {
			label: "Name",
		},
		validation: {
			zod: z.string(),
			required: true,
		},
	})
	.addText("social_url", {
		details: {
			label: "URL",
		},
		validation: {
			zod: z.string().url(),
			required: true,
		},
	})
	.endRepeater();

export default SettingsCollection;
