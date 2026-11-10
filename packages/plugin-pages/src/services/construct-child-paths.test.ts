import { describe, expect, test } from "vitest";
import type { CollectionConfig } from "../types/types.js";
import constructChildPath from "./construct-child-paths.js";
import type { PageVersionFields } from "./get-pages-fields.js";

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
	trackPaths: false,
} satisfies CollectionConfig;

describe("constructChildPath", () => {
	test("applies the collection prefix when descendants become top-level after a parent delete", () => {
		const descendants: PageVersionFields[] = [
			{
				document_id: 2,
				document_version_id: 20,
				rows: [
					{
						locale: null,
						_slug: "Child",
						_path: "/old-parent/child",
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
						_path: "/old-parent/child/grandchild",
						_parentPage: 2,
					},
				],
			},
		];

		const res = constructChildPath({
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
				values: new Map([[null, "/blog/child"]]),
			},
			{
				documentId: 3,
				versionId: 30,
				values: new Map([[null, "/blog/child/grandchild"]]),
			},
		]);
	});

	test("applies localized collection prefixes after a parent delete", () => {
		const descendants: PageVersionFields[] = [
			{
				document_id: 2,
				document_version_id: 20,
				rows: [
					{
						locale: "en",
						_slug: "Child",
						_path: "/old-parent/child",
						_parentPage: 1,
					},
					{
						locale: "fr",
						_slug: "Enfant",
						_path: "/ancien-parent/enfant",
						_parentPage: 1,
					},
				],
			},
		];

		const res = constructChildPath({
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
				values: new Map(
					Object.entries({
						en: "/blog/child",
						fr: "/actualites/enfant",
					}),
				),
			},
		]);
	});

	test("rebuilds stale paths from the root when given every page, leaving current ones out", () => {
		const pages: PageVersionFields[] = [
			{
				document_id: 1,
				document_version_id: 10,
				rows: [
					{ locale: null, _slug: "about", _path: "/about", _parentPage: null },
				],
			},
			{
				document_id: 2,
				document_version_id: 20,
				rows: [
					{
						locale: null,
						_slug: "team",
						_path: "/old-parent/team",
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
						_slug: "jobs",
						_path: "/about/team/jobs",
						_parentPage: 2,
					},
				],
			},
		];

		const res = constructChildPath({
			descendants: pages,
			localization,
			collection: baseCollection,
		});

		expect(res.error).toBeUndefined();
		expect(res.data).toEqual([
			{
				documentId: 2,
				versionId: 20,
				values: new Map([[null, "/about/team"]]),
			},
		]);
	});

	test("uses each descendant's resolved relation-derived prefix", () => {
		const descendants: PageVersionFields[] = [
			{
				document_id: 2,
				document_version_id: 20,
				rows: [
					{
						locale: null,
						_slug: "getting-started",
						_path: "/old/getting-started",
						_parentPage: null,
					},
				],
			},
		];

		const res = constructChildPath({
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
				values: new Map([[null, "/docs/lucid/v1/getting-started"]]),
			},
		]);
	});
});
