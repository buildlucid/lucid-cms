import { expect, test } from "vitest";
import type { CollectionConfig } from "../types/types.js";
import resolveCollectionPrefix from "./resolve-collection-prefix.js";

test("should resolve a shared string prefix", async () => {
	const prefix = resolveCollectionPrefix({
		collection: {
			collectionKey: "pages",
			useTranslations: true,
			displayFullSlug: false,
			prefix: "Blog",
		} satisfies CollectionConfig,
		localeCode: "en",
	});

	expect(prefix).toBe("blog");
});

test("should resolve a locale specific prefix", async () => {
	const prefix = resolveCollectionPrefix({
		collection: {
			collectionKey: "pages",
			useTranslations: true,
			displayFullSlug: false,
			prefix: {
				en: "News",
				fr: "/Actualites/",
			},
		} satisfies CollectionConfig,
		localeCode: "fr",
	});

	expect(prefix).toBe("actualites");
});
