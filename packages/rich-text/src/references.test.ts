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
					type: "lucidDocument",
					attrs: { collectionKey: "posts", documentId: 44 },
				},
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
								source: "document",
								collectionKey: "settings",
								documentId: 33,
								fieldKey: "siteName",
							},
						},
						{
							type: "lucidVariable",
							attrs: {
								source: "user",
								userId: 9,
								fieldKey: "firstName",
							},
						},
					],
				},
				{ type: "lucidEmbeddedBrick", attrs: { ref: "hero-ref" } },
			],
		};

		expect(extractRichTextReferences(value)).toEqual([
			{ type: "rich-text-media", mediaId: 11 },
			{
				type: "rich-text-document",
				collectionKey: "posts",
				documentId: 44,
			},
			{
				type: "rich-text-document-link",
				collectionKey: "pages",
				documentId: 22,
			},
			{
				type: "rich-text-variable",
				source: "document",
				collectionKey: "settings",
				documentId: 33,
				userId: undefined,
				fieldKey: "siteName",
			},
			{
				type: "rich-text-variable",
				source: "user",
				collectionKey: undefined,
				documentId: undefined,
				userId: 9,
				fieldKey: "firstName",
			},
			{ type: "rich-text-embedded-brick", ref: "hero-ref" },
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
			{ type: "rich-text-media", mediaId: "invalid" },
			{ type: "rich-text-embedded-brick", ref: "card-ref" },
			{ type: "rich-text-embedded-brick", ref: "card-ref" },
			{ type: "rich-text-embedded-brick", ref: null },
		]);
		expect(extractEmbeddedBrickRefs(value)).toEqual(["card-ref"]);
	});
});
