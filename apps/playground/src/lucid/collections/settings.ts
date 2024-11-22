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
		labels: {
			title: "Site Title",
		},
	})
	.addMedia("site_logo", {
		labels: {
			title: "Site Logo",
		},
	})
	.addRepeater("social_links", {
		labels: {
			title: "Social Links",
		},
	})
	.addText("social_name", {
		labels: {
			title: "Name",
		},
		validation: {
			zod: z.string(),
			required: true,
		},
	})
	.addText("social_url", {
		labels: {
			title: "URL",
		},
		validation: {
			zod: z.string().url(),
			required: true,
		},
	})
	.endRepeater();

export default SettingsCollection;
