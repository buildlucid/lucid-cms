import { z } from "@lucidcms/core";
import { CollectionBuilder } from "@lucidcms/core/builders";
import SeoBrick from "../bricks/seo.js";

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
		fixed: [SeoBrick],
	},
})
	.addText("siteTitle", {
		details: {
			label: "Site Title",
		},
	})
	.addMedia("siteLogo", {
		details: {
			label: "Site Logo",
		},
	})
	.addRepeater("socialLinks", {
		details: {
			label: "Social Links",
		},
	})
	.addText("socialName", {
		details: {
			label: "Name",
		},
		validation: {
			zod: z.string(),
			required: true,
		},
	})
	.addText("socialUrl", {
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
