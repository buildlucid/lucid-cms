import { describe, expect, test } from "vitest";
import CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import checkCollectionRouting from "./check-collection-routing.js";

const details = {
	name: "Pages",
	singularName: "Page",
};

describe("checkCollectionRouting", () => {
	test("accepts a top-level scalar route field", () => {
		const collection = new CollectionBuilder("pages", {
			mode: "multiple",
			details,
			routing: "path",
			preview: true,
		}).addText("path");

		expect(() => checkCollectionRouting(collection)).not.toThrow();
		expect(collection.getData.routing).toEqual({ field: "path" });
	});

	test("requires routing only for enabled previews using the default URL", () => {
		const defaultPreview = new CollectionBuilder("default-preview", {
			mode: "multiple",
			details,
			preview: true,
		});
		const customPreview = new CollectionBuilder("custom-preview", {
			mode: "multiple",
			details,
			preview: { enabled: true, url: () => "https://example.com" },
		});
		const disabledPreview = new CollectionBuilder("disabled-preview", {
			mode: "multiple",
			details,
			preview: { enabled: false },
		});

		expect(() => checkCollectionRouting(defaultPreview)).toThrow(
			"must configure routing",
		);
		expect(() => checkCollectionRouting(customPreview)).not.toThrow();
		expect(() => checkCollectionRouting(disabledPreview)).not.toThrow();
	});

	test("rejects missing, relational, and structurally nested fields", () => {
		const collections = [
			new CollectionBuilder("missing", {
				mode: "multiple",
				details,
				routing: "path",
			}),
			new CollectionBuilder("relational", {
				mode: "multiple",
				details,
				routing: "path",
			}).addRelation("path", { collection: "relational" }),
			new CollectionBuilder("nested", {
				mode: "multiple",
				details,
				routing: "path",
			})
				.addSection("seo")
				.addText("path")
				.endSection(),
		];

		for (const collection of collections) {
			expect(() => checkCollectionRouting(collection)).toThrow(Error);
		}
	});
});
