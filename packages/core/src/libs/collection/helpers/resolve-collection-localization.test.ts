import { describe, expect, test } from "vitest";
import CollectionBuilder from "../builders/collection-builder/index.js";
import type { CollectionLocalizationConfig } from "../builders/collection-builder/types.js";
import resolveCollectionLocalization from "./resolve-collection-localization.js";

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

describe("resolveCollectionLocalization", () => {
	test("keeps disabled collections on the shared null row", () => {
		expect(
			resolveCollectionLocalization({
				localization,
				collection: collection(false),
			}),
		).toEqual({
			enabled: false,
			locales: [],
			defaultLocale: "en",
			storageLocale: null,
			rowLocales: [null],
		});
	});

	test("resolves true to the complete project locale configuration", () => {
		expect(
			resolveCollectionLocalization({
				localization,
				collection: collection(true),
			}),
		).toEqual({
			enabled: true,
			locales: ["en", "fr", "de"],
			defaultLocale: "en",
			storageLocale: null,
			rowLocales: [null, "en", "fr", "de"],
		});
	});

	test("resolves a subset in project order and retains its storage row", () => {
		const target = collection({
			locales: ["de", "fr"],
			defaultLocale: "fr",
		});

		expect(target.getData.localized).toBe(true);
		expect(
			resolveCollectionLocalization({ localization, collection: target }),
		).toEqual({
			enabled: true,
			locales: ["fr", "de"],
			defaultLocale: "fr",
			storageLocale: null,
			rowLocales: [null, "fr", "de"],
		});
	});

	test("supports overriding only the collection default locale", () => {
		expect(
			resolveCollectionLocalization({
				localization,
				collection: collection({ defaultLocale: "fr" }),
			}),
		).toMatchObject({
			locales: ["en", "fr", "de"],
			defaultLocale: "fr",
		});
	});
});
