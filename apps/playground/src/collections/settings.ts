import { CollectionBuilder, copy, z } from "@lucidcms/core";
import SEOBrick from "../bricks/seo.js";

const SettingsCollection = new CollectionBuilder("settings", {
	mode: "single",
	details: {
		name: copy("admin:collections.settings.name", {
			defaultMessage: "Settings",
		}),
		singularName: copy("admin:collections.settings.singularName", {
			defaultMessage: "Setting",
		}),
		summary: copy("admin:collections.settings.summary", {
			defaultMessage: "Set shared settings for your website.",
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
			label: copy("admin:collections.settings.fields.site_title.label", {
				defaultMessage: "Site Title",
			}),
		},
	})
	.addMedia("site_logo", {
		details: {
			label: copy("admin:collections.settings.fields.site_logo.label", {
				defaultMessage: "Site Logo",
			}),
		},
	})
	.addRepeater("social_links", {
		details: {
			label: copy("admin:collections.settings.fields.social_links.label", {
				defaultMessage: "Social Links",
			}),
		},
	})
	.addText("social_name", {
		details: {
			label: copy("admin:collections.settings.fields.social_name.label", {
				defaultMessage: "Name",
			}),
		},
		validation: {
			zod: z.string(),
			required: true,
		},
	})
	.addText("social_url", {
		details: {
			label: copy("admin:collections.settings.fields.social_url.label", {
				defaultMessage: "URL",
			}),
		},
		validation: {
			zod: z.string().url(),
			required: true,
		},
	})
	.endRepeater();

export default SettingsCollection;
