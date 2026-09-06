import { describe, expect, test } from "vitest";
import type { CollectionConfig } from "../types/types.js";
import constructParentFullSlug from "./construct-parent-fullslug.js";

const localization: import("../utils/resolve-pages-collection-localization.js").ResolvedPagesCollectionLocalization =
	{
		enabled: false,
		defaultLocale: null,
		storageLocale: null,
		locales: [null],
	};

const collection = {
	key: "pages",
	localized: false,
	prefix: "en",
	segments: [],
	ui: {
		fullSlug: false,
		placement: { at: "end" },
		widths: {
			fullSlug: 12,
			slug: 12,
			parentPage: 12,
			segments: 12,
		},
	},
	unique: true,
} satisfies CollectionConfig;

describe("constructParentFullSlug", () => {
	test("allows ordinary prefixed pages to use the homepage as their parent", () => {
		const result = constructParentFullSlug({
			collection,
			localization,
			parentFields: [
				{
					document_id: 1,
					locale: null,
					_slug: "/",
					_fullSlug: "/",
					_parentPage: null,
				},
			],
			fields: {
				slug: { key: "slug", type: "text", value: "about" },
			},
			routePrefixes: new Map([[null, "/en"]]),
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toEqual(new Map([[null, "/about"]]));
	});

	test("blocks a child route when its parent only has another locale", () => {
		const result = constructParentFullSlug({
			collection: { ...collection, localized: true },
			localization: {
				enabled: true,
				defaultLocale: "fr",
				storageLocale: null,
				locales: ["de", "fr"],
			},
			parentFields: [
				{
					document_id: 1,
					locale: "fr",
					_slug: "parent",
					_fullSlug: "/parent",
					_parentPage: null,
				},
			],
			fields: {
				slug: {
					key: "slug",
					type: "text",
					translations: { de: "child", fr: "" },
				},
			},
		});
		expect(result.data).toBeUndefined();
		expect(result.error).toMatchObject({
			status: 400,
			errors: { fields: [{ key: "parentPage", localeCode: "de" }] },
		});
	});

	test("keeps snapshot previews readable when a parent route is missing", () => {
		const result = constructParentFullSlug({
			collection: { ...collection, localized: true },
			missingParentIsEmpty: true,
			localization: {
				enabled: true,
				defaultLocale: "fr",
				storageLocale: null,
				locales: ["de", "fr"],
			},
			parentFields: [
				{
					document_id: 1,
					locale: "fr",
					_slug: "parent",
					_fullSlug: "/parent",
					_parentPage: null,
				},
			],
			fields: {
				slug: {
					key: "slug",
					type: "text",
					translations: { de: "child", fr: "" },
				},
			},
		});
		expect(result.error).toBeUndefined();
		expect(result.data?.get("de")).toBe("/en/child");
	});

	test("allows a child when its parent has the matching route and other child translations are empty", () => {
		const result = constructParentFullSlug({
			collection: { ...collection, localized: true },
			localization: {
				enabled: true,
				defaultLocale: "fr",
				storageLocale: null,
				locales: ["de", "fr"],
			},
			parentFields: [
				{
					document_id: 1,
					locale: "de",
					_slug: "parent",
					_fullSlug: "/parent",
					_parentPage: null,
				},
			],
			fields: {
				slug: {
					key: "slug",
					type: "text",
					translations: { de: "child", fr: "" },
				},
			},
		});
		expect(result.error).toBeUndefined();
		expect(result.data?.get("de")).toBe("/parent/child");
		expect(result.data?.get("fr")).toBeNull();
	});

	test("still rejects parents from a different configured route segment", () => {
		const result = constructParentFullSlug({
			collection: {
				...collection,
				segments: [
					{ relation: "product", collection: "products", field: "key" },
				],
			},
			localization,
			parentFields: [
				{
					document_id: 1,
					locale: null,
					_slug: "intro",
					_fullSlug: "/docs/other/intro",
					_parentPage: null,
				},
			],
			fields: {
				slug: { key: "slug", type: "text", value: "about" },
			},
			routePrefixes: new Map([[null, "/docs/lucid"]]),
		});

		expect(result.error?.status).toBe(400);
	});
});
