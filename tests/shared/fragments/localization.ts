import { defineCollection, field, z } from "@lucidcms/core";
import type { LucidConfig } from "@lucidcms/core/types";

/** Content in English and French. Spread it into a setup's config as `localization`. */
export const localization = {
	locales: [
		{ label: "English", code: "en", direction: "ltr" },
		{ label: "French", code: "fr", direction: "ltr" },
	],
	defaultLocale: "en",
} satisfies LucidConfig["localization"];

/** A localized collection for localization tests. Add it to a setup's collections with the config above. */
export const ArticleCollection = defineCollection({
	key: "article",
	mode: "multiple",
	details: {
		labels: { singular: "Article", plural: "Articles" },
	},
	localized: true,
	fields: [
		field.text("title", {
			validation: { required: true, zod: z.string().min(1).max(128) },
			useAsLabel: true,
		}),
	],
});
