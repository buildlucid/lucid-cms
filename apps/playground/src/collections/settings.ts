import { adminText, CollectionBuilder, z } from "@lucidcms/core";
import SEOBrick from "../bricks/seo.js";

const SettingsCollection = new CollectionBuilder("settings", {
	mode: "single",
	details: {
		name: adminText("collections.settings.name", {
			fallback: "Settings",
		}),
		singularName: adminText("collections.settings.singularName", {
			fallback: "Setting",
		}),
		summary: adminText("collections.settings.summary", {
			fallback: "Set shared settings for your website.",
		}),
	},
	config: {
		revisions: true,
	},
	bricks: {
		fixed: [SEOBrick],
	},
})
	.addText("site_title", {
		details: {
			label: adminText("collections.settings.fields.site_title.label", {
				fallback: "Site Title",
			}),
		},
	})
	.addMedia("site_logo", {
		details: {
			label: adminText("collections.settings.fields.site_logo.label", {
				fallback: "Site Logo",
			}),
		},
	})
	.addRepeater("social_links", {
		details: {
			label: adminText("collections.settings.fields.social_links.label", {
				fallback: "Social Links",
			}),
		},
	})
	.addText("social_name", {
		details: {
			label: adminText("collections.settings.fields.social_name.label", {
				fallback: "Name",
			}),
		},
		validation: {
			zod: z.string(),
			required: true,
		},
	})
	.addText("social_url", {
		details: {
			label: adminText("collections.settings.fields.social_url.label", {
				fallback: "URL",
			}),
		},
		validation: {
			zod: z.string().url(),
			required: true,
		},
	})
	.endRepeater();

export default SettingsCollection;
