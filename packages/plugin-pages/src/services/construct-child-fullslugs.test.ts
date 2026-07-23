import type { Config } from "@lucidcms/core/types";
import { describe, expect, test } from "vitest";
import type { CollectionConfig } from "../types/types.js";
import constructChildFullSlug from "./construct-child-fullslugs.js";
import type { DescendantFieldsResponse } from "./get-descendant-fields.js";

const localization = {
	defaultLocale: "en",
	locales: [{ code: "en" }],
} as Config["localization"];

const baseCollection = {
	collection: "pages",
	localized: false,
	ui: {
		fullSlug: false,
		widths: {
			fullSlug: 12,
			slug: 12,
			parentPage: 12,
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
						locale: "en",
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
						locale: "en",
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
				fullSlugs: { en: "/blog/child" },
			},
			{
				documentId: 3,
				versionId: 30,
				fullSlugs: { en: "/blog/child/grandchild" },
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
				defaultLocale: "en",
				locales: [{ code: "en" }, { code: "fr" }],
			} as Config["localization"],
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
				fullSlugs: {
					en: "/blog/child",
					fr: "/actualites/enfant",
				},
			},
		]);
	});
});
