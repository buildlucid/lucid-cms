import { CollectionBuilder } from "@lucidcms/core";
import { describe, expect, test } from "vitest";
import type { CollectionConfig } from "../types/types.js";
import resolveRouteSegmentValues from "./resolve-route-segment-values.js";

const localization = {
	defaultLocale: "en",
	locales: [{ code: "en" }, { code: "fr" }, { code: "de" }],
};

const collection = {
	key: "pages",
	localized: true,
	prefix: { en: "/en", fr: "/fr", de: "/de" },
	segments: [],
	ui: {
		placement: { at: "end" },
		widths: { slug: 6, parentPage: 12, segments: 12 },
	},
	unique: true,
} satisfies CollectionConfig;

describe("resolveRouteSegmentValues", () => {
	test("uses only the source collection's supported content locales", async () => {
		const collectionInstance = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				labels: {
					singular: "Page",
					plural: "Pages",
				},
			},
			localized: { locales: ["fr"], defaultLocale: "fr" },
		});

		const result = await resolveRouteSegmentValues(
			{ config: { localization } } as never,
			{
				collection,
				collectionInstance,
				versionType: "latest",
				targets: [],
				sourceKeys: ["current"],
			},
		);

		expect(result.error).toBeUndefined();
		expect(result.data?.get("current")).toEqual(
			new Map(Object.entries({ fr: "fr" })),
		);
	});

	test("uses the storage locale when the Pages fields are not localized", async () => {
		const collectionInstance = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				labels: {
					singular: "Page",
					plural: "Pages",
				},
			},
			localized: { locales: ["fr"], defaultLocale: "fr" },
		});

		const result = await resolveRouteSegmentValues(
			{ config: { localization } } as never,
			{
				collection: { ...collection, localized: false },
				collectionInstance,
				versionType: "latest",
				targets: [],
				sourceKeys: ["current"],
			},
		);

		expect(result.error).toBeUndefined();
		expect(result.data?.get("current")).toEqual(new Map([[null, null]]));
	});
});
