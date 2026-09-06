import { describe, expect, test } from "vitest";
import CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import type { CollectionLocalizationConfig } from "../../collection/builders/collection-builder/types.js";
import checkCollectionLocalization from "./check-collection-localization.js";

const localization = {
	locales: [
		{ label: "English", code: "en" },
		{ label: "French", code: "fr" },
		{ label: "German", code: "de" },
	],
	defaultLocale: "en",
};

const collection = (localized?: CollectionLocalizationConfig) =>
	new CollectionBuilder("articles", {
		mode: "multiple",
		details: {
			labels: {
				singular: "Article",
				plural: "Articles",
			},
		},
		localized,
	});

describe("checkCollectionLocalization", () => {
	test.each([
		false,
		true,
		{ defaultLocale: "fr" },
		{ locales: ["fr", "de"], defaultLocale: "fr" },
	] satisfies CollectionLocalizationConfig[])("accepts valid collection localization %#", (localized) => {
		expect(() =>
			checkCollectionLocalization(localization, collection(localized)),
		).not.toThrow();
	});

	test.each([
		[{ locales: ["fr"] }, "default locale 'en'"],
		[{ locales: ["fr", "fr"], defaultLocale: "fr" }, "locale 'fr' more"],
		[{ locales: ["fr", "es"], defaultLocale: "fr" }, "locale 'es'"],
		[{ defaultLocale: "es" }, "default locale 'es'"],
	] satisfies Array<
		[CollectionLocalizationConfig, string]
	>)("rejects invalid collection localization %#", (localized, message) => {
		expect(() =>
			checkCollectionLocalization(localization, collection(localized)),
		).toThrow(message);
	});
});
