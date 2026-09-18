import { describe, expect, test } from "vitest";
import type { CollectionConfig } from "../types/types.js";
import constructChildFullSlug from "./construct-child-fullslugs.js";
import type { DescendantFieldsResponse } from "./get-descendant-fields.js";

const localization: import("../utils/resolve-pages-collection-localization.js").ResolvedPagesCollectionLocalization =
	{
		enabled: false,
		defaultLocale: null,
		storageLocale: null,
		locales: [null],
	};

const baseCollection = {
	key: "pages",
	localized: false,
	segments: [],
	ui: {
		placement: { at: "end" },
		widths: {
			slug: 12,
			parentPage: 12,
			segments: 12,
		},
	},
	unique: true,
} satisfies CollectionConfig;

describe("constructChildFullSlug", () => {
	test("applies the collection prefix when descendants become top-level after a parent delete", () => {
		const descendants: DescendantFieldsResponse[] = [
			{
				document_id: 2,
				document_version_id: 20,
				rows: [
					{
						locale: null,
						_slug: "Child",
						_fullSlug: "/old-parent/child",
						_parentPage: 1,
					},
				],
			},
			{
				document_id: 3,
				document_version_id: 30,
				rows: [
					{
						locale: null,
						_slug: "Grandchild",
						_fullSlug: "/old-parent/child/grandchild",
						_parentPage: 2,
					},
				],
			},
		];

		const res = constructChildFullSlug({
			descendants,
			localization,
			collection: {
				...baseCollection,
				prefix: "Blog",
			},
		});

		expect(res.error).toBeUndefined();
		expect(res.data).toEqual([
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: new Map([[null, "/blog/child"]]),
			},
			{
				documentId: 3,
				versionId: 30,
				fullSlugs: new Map([[null, "/blog/child/grandchild"]]),
			},
		]);
	});

	test("applies localized collection prefixes after a parent delete", () => {
		const descendants: DescendantFieldsResponse[] = [
			{
				document_id: 2,
				document_version_id: 20,
				rows: [
					{
						locale: "en",
						_slug: "Child",
						_fullSlug: "/old-parent/child",
						_parentPage: 1,
					},
					{
						locale: "fr",
						_slug: "Enfant",
						_fullSlug: "/ancien-parent/enfant",
						_parentPage: 1,
					},
				],
			},
		];

		const res = constructChildFullSlug({
			descendants,
			localization: {
				enabled: true,
				defaultLocale: "en",
				storageLocale: null,
				locales: ["en", "fr"],
			},
			collection: {
				...baseCollection,
				localized: true,
				prefix: {
					en: "Blog",
					fr: "Actualites",
				},
			},
		});

		expect(res.error).toBeUndefined();
		expect(res.data).toEqual([
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: new Map(
					Object.entries({
						en: "/blog/child",
						fr: "/actualites/enfant",
					}),
				),
			},
		]);
	});

	test("uses each descendant's resolved relation-derived prefix", () => {
		const descendants: DescendantFieldsResponse[] = [
			{
				document_id: 2,
				document_version_id: 20,
				rows: [
					{
						locale: null,
						_slug: "getting-started",
						_fullSlug: "/old/getting-started",
						_parentPage: null,
					},
				],
			},
		];

		const res = constructChildFullSlug({
			descendants,
			localization,
			collection: {
				...baseCollection,
				segments: [
					{ relation: "product", collection: "products", field: "key" },
				],
			},
			routePrefixes: new Map([[20, new Map([[null, "/docs/lucid/v1"]])]]),
		});

		expect(res.error).toBeUndefined();
		expect(res.data).toEqual([
			{
				documentId: 2,
				versionId: 20,
				fullSlugs: new Map([[null, "/docs/lucid/v1/getting-started"]]),
			},
		]);
	});
});
