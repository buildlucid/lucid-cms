import { defineCollection, field } from "@lucidcms/core";

/**
 * A collection only this setup has, for the pages plugin to manage.
 * Plugins that change a collection get their own, so the shared ones behave the same everywhere.
 */
const LandingPageCollection = defineCollection({
	key: "landing-page",
	mode: "multiple",
	details: {
		labels: { singular: "Landing page", plural: "Landing pages" },
	},
	fields: [field.text("heading")],
});

export default LandingPageCollection;
