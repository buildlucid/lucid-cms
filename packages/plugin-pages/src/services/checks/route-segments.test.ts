import { defineCollection, field, LucidError } from "@lucidcms/core";
import { describe, expect, test } from "vitest";
import pagesPlugin from "../../plugin.js";
import type { CollectionConfig } from "../../types/types.js";
import registerFields from "../register-fields.js";
import checkRouteSegments from "./route-segments.js";

const details = {
	labels: {
		singular: "Document",
		plural: "Documents",
	},
};

const config = {
	key: "documentation",
	localized: false,
	segments: [{ relation: "product", collection: "product", field: "key" }],
	ui: {
		placement: { at: "end" },
		widths: { slug: 6, parentPage: 12, segments: 12 },
	},
	unique: true,
	trackPaths: false,
} satisfies CollectionConfig;

describe("route segments", () => {
	test("accepts a generated single relation to a scalar field", () => {
		const product = defineCollection({
			key: "product",
			mode: "multiple",
			details,
			fields: [field.text("key")],
		});
		const documentation = defineCollection({
			key: "documentation",
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

	test("the plugin exposes its computed path as collection routing", () => {
		const product = defineCollection({
			key: "product",
			mode: "multiple",
			details,
			fields: [field.text("key")],
		});
		const documentation = defineCollection({
			key: "documentation",
			mode: "multiple",
			details,
		});
		const draft = {
			i18n: { sources: [] },
			admin: {
				agentHomescreen: true,
				slots: [],
				routes: [],
				scripts: [],
				stylesheets: [],
			},
			collections: [documentation, product],
			hooks: [],
			jobs: { definitions: [] },
			migrations: { definitions: [] },
			redirects: [],
			localization: { locales: [], defaultLocale: null },
			http: { routes: [] },
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
		}).configure?.(draft);
		expect(documentation.getData.routing).toEqual({ field: "path" });
	});

	test("rejects missing collections and structurally nested segment fields", () => {
		const product = defineCollection({
			key: "product",
			mode: "multiple",
			details,
			fields: [field.section("routing", { fields: [field.text("key")] })],
		});
		const documentation = defineCollection({
			key: "documentation",
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
