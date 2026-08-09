import { CollectionBuilder, LucidError } from "@lucidcms/core";
import { describe, expect, test } from "vitest";
import pagesPlugin from "../../plugin.js";
import type { CollectionConfig } from "../../types/types.js";
import registerFields from "../register-fields.js";
import checkRouteSegments from "./route-segments.js";

const details = {
	name: "Documents",
	singularName: "Document",
};

const config = {
	key: "documentation",
	localized: false,
	segments: [{ relation: "product", collection: "product", field: "key" }],
	ui: {
		fullSlug: true,
		widths: { fullSlug: 6, slug: 6, parentPage: 12, segments: 12 },
	},
	unique: true,
} satisfies CollectionConfig;

describe("route segments", () => {
	test("accepts a generated single relation to a scalar field", () => {
		const product = new CollectionBuilder("product", {
			mode: "multiple",
			details,
		}).addText("key");
		const documentation = new CollectionBuilder("documentation", {
			mode: "multiple",
			details,
		});
		registerFields(documentation as never, config);

		expect(() =>
			checkRouteSegments({
				collection: documentation,
				collections: [documentation, product],
				config,
			}),
		).not.toThrow();
	});

	test("the plugin exposes its computed fullSlug as collection routing", () => {
		const product = new CollectionBuilder("product", {
			mode: "multiple",
			details,
		}).addText("key");
		const documentation = new CollectionBuilder("documentation", {
			mode: "multiple",
			details,
		});
		const draft = {
			i18n: { sources: [] },
			collections: [documentation, product],
			hooks: [],
		} as never;

		pagesPlugin({
			collections: [
				{
					key: "documentation",
					segments: [
						{ relation: "product", collection: "product", field: "key" },
					],
				},
			],
		}).recipe(draft);

		expect(documentation.getData.routing).toEqual({ field: "fullSlug" });
	});

	test("rejects missing collections and structurally nested segment fields", () => {
		const product = new CollectionBuilder("product", {
			mode: "multiple",
			details,
		})
			.addSection("routing")
			.addText("key")
			.endSection();
		const documentation = new CollectionBuilder("documentation", {
			mode: "multiple",
			details,
		});
		registerFields(documentation as never, config);

		expect(() =>
			checkRouteSegments({
				collection: documentation,
				collections: [documentation],
				config,
			}),
		).toThrow(LucidError);
		expect(() =>
			checkRouteSegments({
				collection: documentation,
				collections: [documentation, product],
				config,
			}),
		).toThrow(LucidError);
	});
});
