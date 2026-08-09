import type { Config } from "@lucidcms/core/types";
import { describe, expect, test } from "vitest";
import type { CollectionConfig } from "../types/types.js";
import constructParentFullSlug from "./construct-parent-fullslug.js";

const localization = {
	defaultLocale: "en",
	locales: [{ code: "en" }],
} as Config["localization"];

const collection = {
	key: "pages",
	localized: false,
	prefix: "en",
	segments: [],
	ui: {
		fullSlug: false,
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
					locale: "en",
					_slug: "/",
					_fullSlug: "/",
					_parentPage: null,
				},
			],
			fields: {
				slug: { key: "slug", type: "text", value: "about" },
			},
			routePrefixes: { en: "/en" },
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toEqual({ en: "/about" });
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
					locale: "en",
					_slug: "intro",
					_fullSlug: "/docs/other/intro",
					_parentPage: null,
				},
			],
			fields: {
				slug: { key: "slug", type: "text", value: "about" },
			},
			routePrefixes: { en: "/docs/lucid" },
		});

		expect(result.error?.status).toBe(400);
	});
});
