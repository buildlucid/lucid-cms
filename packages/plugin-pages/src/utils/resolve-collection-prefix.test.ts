import { expect, test } from "vitest";
import type { CollectionConfig } from "../types/types.js";
import resolveCollectionPrefix from "./resolve-collection-prefix.js";

test("should resolve a shared string prefix", async () => {
	const prefix = resolveCollectionPrefix({
		collection: {
			collection: "pages",
			localized: true,
			ui: {
				fullSlug: false,
				widths: {
					fullSlug: 12,
					slug: 12,
					parentPage: 12,
				},
			},
			unique: true,
			prefix: "Blog",
		} satisfies CollectionConfig,
		localeCode: "en",
	});

	expect(prefix).toBe("blog");
});

test("should resolve a locale specific prefix", async () => {
	const prefix = resolveCollectionPrefix({
		collection: {
			collection: "pages",
			localized: true,
			ui: {
				fullSlug: false,
				widths: {
					fullSlug: 12,
					slug: 12,
					parentPage: 12,
				},
			},
			unique: true,
			prefix: {
				en: "News",
				fr: "/Actualites/",
			},
		} satisfies CollectionConfig,
		localeCode: "fr",
	});

	expect(prefix).toBe("actualites");
});
