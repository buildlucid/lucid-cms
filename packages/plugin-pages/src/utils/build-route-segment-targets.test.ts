import { CollectionBuilder } from "@lucidcms/core";
import { describe, expect, test } from "vitest";
import type { CollectionConfig } from "../types/types.js";
import buildRouteSegmentTargets from "./build-route-segment-targets.js";

const pageConfig = {
	key: "pages",
	localized: true,
	segments: [{ relation: "category", collection: "categories", field: "slug" }],
	ui: {
		fullSlug: true,
		placement: { at: "end" },
		widths: { fullSlug: 6, slug: 6, parentPage: 12, segments: 12 },
	},
	unique: true,
} satisfies CollectionConfig;

describe("buildRouteSegmentTargets", () => {
	test.each([
		{ fieldLocalized: false, expectedLocalized: false },
		{ fieldLocalized: true, expectedLocalized: true },
	])("resolves effective target localization and its storage locale", ({
		fieldLocalized,
		expectedLocalized,
	}) => {
		const pages = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				labels: {
					singular: "Page",
					plural: "Pages",
				},
			},
		}).addRelation("category", {
			collection: "categories",
			multiple: false,
		});
		const categories = new CollectionBuilder("categories", {
			mode: "multiple",
			details: {
				labels: {
					singular: "Category",
					plural: "Categories",
				},
			},
			localized: { locales: ["fr"], defaultLocale: "fr" },
		}).addText("slug", { localized: fieldLocalized });

		const result = buildRouteSegmentTargets({
			collection: pageConfig,
			collectionInstance: pages,
			collections: [pages, categories],
			localization: {
				defaultLocale: "en",
				locales: [{ code: "en" }, { code: "fr" }],
			},
			sourceKeys: ["current"],
			selections: [
				{
					sourceKey: "current",
					index: 0,
					collectionKey: "categories",
					documentId: 12,
				},
			],
		});

		expect(result.missingRelation).toBeNull();
		expect(result.targets).toEqual([
			{
				sourceKey: "current",
				index: 0,
				relation: "category",
				field: "slug",
				collectionKey: "categories",
				documentId: 12,
				localized: expectedLocalized,
				storageLocale: null,
			},
		]);
	});
});
