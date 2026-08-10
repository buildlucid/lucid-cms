import { describe, expect, test } from "vitest";
import {
	extractEmbeddedBrickRefs,
	extractRichTextReferences,
} from "./references.js";

describe("rich-text references", () => {
	test("extracts references from nodes and document link marks", () => {
		const value = {
			type: "doc",
			content: [
				{ type: "lucidMedia", attrs: { mediaId: 11 } },
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Linked",
							marks: [
								{
									type: "link",
									attrs: {
										kind: "document",
										collectionKey: "pages",
										documentId: 22,
									},
								},
							],
						},
						{
							type: "lucidVariable",
							attrs: {
								collectionKey: "settings",
								documentId: 33,
								fieldKey: "siteName",
							},
						},
					],
				},
				{ type: "lucidEmbeddedBrick", attrs: { ref: "hero-ref" } },
			],
		};

		expect(extractRichTextReferences(value)).toEqual([
			{ type: "media", mediaId: 11 },
			{
				type: "document-link",
				collectionKey: "pages",
				documentId: 22,
			},
			{
				type: "variable",
				collectionKey: "settings",
				documentId: 33,
				fieldKey: "siteName",
			},
			{ type: "embedded-brick", ref: "hero-ref" },
		]);
	});

	test("preserves malformed values for validation and deduplicates brick refs", () => {
		const value = {
			type: "doc",
			content: [
				{ type: "lucidMedia", attrs: { mediaId: "invalid" } },
				{ type: "lucidEmbeddedBrick", attrs: { ref: "card-ref" } },
				{ type: "lucidEmbeddedBrick", attrs: { ref: "card-ref" } },
				{ type: "lucidEmbeddedBrick", attrs: { ref: null } },
			],
		};

		expect(extractRichTextReferences(value)).toEqual([
			{ type: "media", mediaId: "invalid" },
			{ type: "embedded-brick", ref: "card-ref" },
			{ type: "embedded-brick", ref: "card-ref" },
			{ type: "embedded-brick", ref: null },
		]);
		expect(extractEmbeddedBrickRefs(value)).toEqual(["card-ref"]);
	});
});
