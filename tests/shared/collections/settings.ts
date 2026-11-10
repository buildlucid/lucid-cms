import { defineCollection, field } from "@lucidcms/core";

/** A single-document collection, which every setup registers so tests can rely on it. */
const SettingsCollection = defineCollection({
	key: "settings",
	mode: "single",
	details: {
		labels: { singular: "Settings", plural: "Settings" },
	},
	fields: [field.text("siteName")],
});

export default SettingsCollection;
