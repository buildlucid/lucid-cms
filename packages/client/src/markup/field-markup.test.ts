import { describe, expect, test } from "vitest";
import { previewFieldMarkup } from "./field-markup.js";

describe("previewFieldMarkup", () => {
	test("writes the attribute Lucid's preview page script reads", () => {
		const target = {
			collectionKey: "page",
			documentId: 2,
			path: ["title"],
			locale: "en",
		};

		expect(previewFieldMarkup(target)).toBe(
			` data-lucid-preview-field="1:${encodeURIComponent(JSON.stringify(target))}"`,
		);
		expect(previewFieldMarkup({ ...target, path: ["x".repeat(4096)] })).toBe(
			"",
		);
		expect(previewFieldMarkup(null)).toBe("");
	});
});
