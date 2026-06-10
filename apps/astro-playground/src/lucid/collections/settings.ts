import { CollectionBuilder, copy, z } from "@lucidcms/core";
import SEOBrick from "../bricks/seo.js";

const SettingsCollection = new CollectionBuilder("settings", {
	mode: "single",
	details: {
		name: copy("admin:collections.settings.name"),
		singularName: copy("admin:collections.settings.singularName"),
		summary: copy("admin:collections.settings.summary"),
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
			label: copy("admin:collections.settings.fields.site_title.label"),
		},
	})
	.addMedia("site_logo", {
		details: {
			label: copy("admin:collections.settings.fields.site_logo.label"),
		},
	})
	.addRepeater("social_links", {
		details: {
			label: copy("admin:collections.settings.fields.social_links.label"),
		},
	})
	.addText("social_name", {
		details: {
			label: copy("admin:collections.settings.fields.social_name.label"),
		},
		validation: {
			zod: z.string(),
			required: true,
		},
	})
	.addText("social_url", {
		details: {
			label: copy("admin:collections.settings.fields.social_url.label"),
		},
		validation: {
			zod: z.string().url(),
			required: true,
		},
	})
	.endRepeater();

export default SettingsCollection;
