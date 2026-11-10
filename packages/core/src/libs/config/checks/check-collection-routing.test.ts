import { describe, expect, test } from "vitest";
import defineCollection from "../../collection/define-collection.js";
import field from "../../collection/definitions/fields/field.js";
import checkCollectionRouting from "./check-collection-routing.js";

const details = {
	labels: {
		singular: "Page",
		plural: "Pages",
	},
};

describe("checkCollectionRouting", () => {
	test("accepts a top-level scalar route field", () => {
		const collection = defineCollection({
			key: "pages",
			mode: "multiple",
			details,
			routing: { field: "path" },
			preview: true,
			fields: [field.text("path")],
		});

		expect(() => checkCollectionRouting(collection)).not.toThrow();
		expect(collection.getData.routing).toEqual({ field: "path" });
	});

	test("requires routing only for enabled previews using the default URL", () => {
		const defaultPreview = defineCollection({
			key: "default-preview",
			mode: "multiple",
			details,
			preview: true,
		});
		const customPreview = defineCollection({
			key: "custom-preview",
			mode: "multiple",
			details,
			preview: { enabled: true, url: () => "https://example.com" },
		});
		const disabledPreview = defineCollection({
			key: "disabled-preview",
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
			defineCollection({
				key: "missing",
				mode: "multiple",
				details,
				routing: { field: "path" },
			}),
			defineCollection({
				key: "relational",
				mode: "multiple",
				details,
				routing: { field: "path" },
				fields: [field.relation("path", { collection: "relational" })],
			}),
			defineCollection({
				key: "nested",
				mode: "multiple",
				details,
				routing: { field: "path" },
				fields: [field.section("seo", { fields: [field.text("path")] })],
			}),
		];

		for (const collection of collections) {
			expect(() => checkCollectionRouting(collection)).toThrow(Error);
		}
	});
});
