import { copy, defineCollection, field, z } from "@lucidcms/core";

const SettingsCollection = defineCollection({
	key: "settings",
	mode: "single",
	details: {
		labels: {
			singular: copy("admin:collections.settings.singularName"),
			plural: copy("admin:collections.settings.name"),
		},
		description: copy("admin:collections.settings.summary"),
	},
	revisions: true,
	fields: [
		field.text("site_title", {
			details: {
				label: copy("admin:collections.settings.fields.site_title.label"),
			},
		}),
		field.text("support_email", {
			details: {
				label: "Support email",
			},
		}),
		field.media("site_logo", {
			details: {
				label: copy("admin:collections.settings.fields.site_logo.label"),
			},
		}),
		field.repeater("social_links", {
			details: {
				label: copy("admin:collections.settings.fields.social_links.label"),
			},
			fields: [
				field.text("social_name", {
					details: {
						label: copy("admin:collections.settings.fields.social_name.label"),
					},
					validation: {
						zod: z.string(),
						required: true,
					},
				}),
				field.text("social_url", {
					details: {
						label: copy("admin:collections.settings.fields.social_url.label"),
					},
					validation: {
						zod: z.string().url(),
						required: true,
					},
				}),
			],
		}),
	],
});

export default SettingsCollection;
