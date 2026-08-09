import { describe, expect, test } from "vitest";
import type { Config } from "../../../types.js";
import CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import { copy } from "../../i18n/index.js";
import checkContentRoutes from "./check-content-routes.js";

const buildCollection = () =>
	new CollectionBuilder("pages", {
		mode: "multiple",
		details: {
			name: copy("admin:tests.collections.pages.name", {
				defaultMessage: "Pages",
			}),
			singularName: copy("admin:tests.collections.pages.singularName", {
				defaultMessage: "Page",
			}),
		},
	})
		.addText("slug")
		.addText("title")
		.addMedia("hero");

const configFor = (
	collection: CollectionBuilder,
	contentRoutes: Config["contentRoutes"],
) =>
	({
		collections: [collection],
		contentRoutes,
	}) as Config;

describe("checkContentRoutes", () => {
	test("accepts top-level scalar path and label fields", () => {
		const collection = buildCollection();
		expect(() =>
			checkContentRoutes(
				configFor(collection, [
					{
						key: "pages",
						collectionKey: "pages",
						path: { field: "slug", prefix: "/pages" },
						label: { fields: ["title"] },
					},
				]),
			),
		).not.toThrow();
	});

	test("rejects duplicate route keys", () => {
		const collection = buildCollection();
		expect(() =>
			checkContentRoutes(
				configFor(collection, [
					{ key: "page", collectionKey: "pages", path: { field: "slug" } },
					{ key: "page", collectionKey: "pages", path: { field: "slug" } },
				]),
			),
		).toThrow(/Duplicate content route key/);
	});

	test("rejects relation-backed path fields", () => {
		const collection = buildCollection();
		expect(() =>
			checkContentRoutes(
				configFor(collection, [
					{ key: "page", collectionKey: "pages", path: { field: "hero" } },
				]),
			),
		).toThrow(/must be a top-level text, textarea, or number field/);
	});
});
