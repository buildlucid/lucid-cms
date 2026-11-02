import { describe, expect, test } from "vitest";
import {
	extractEmbeddedBrickRefs,
	extractRichTextReferences,
	mapRichTextReferences,
	removeRichTextEmbeddedBricks,
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
				{ type: "lucidMention", attrs: { userId: 5, label: "Ada" } },
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
			{ type: "rich-text-mention", userId: 5 },
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

	test("maps reference IDs and removes links to missing targets", () => {
		const linked = {
			type: "link",
			attrs: { kind: "document", collectionKey: "pages", documentId: 2 },
		};
		const missing = {
			type: "link",
			attrs: { kind: "document", collectionKey: "pages", documentId: 3 },
		};
		const value = {
			type: "doc",
			content: [
				{ type: "lucidMedia", attrs: { mediaId: 1 } },
				{ type: "lucidMedia", attrs: { mediaId: 9 } },
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Kept", marks: [linked] },
						{ type: "text", text: "Unlinked", marks: [missing] },
						{ type: "lucidMention", attrs: { userId: 9, label: "will" } },
						{
							type: "lucidVariable",
							attrs: { source: "user", userId: 4, fieldKey: "name" },
						},
					],
				},
			],
		};
		const ids: Record<string, number> = {
			"media:1": 10,
			"documents:pages:2": 20,
			"users:4": 40,
		};

		expect(
			mapRichTextReferences(
				value,
				(target) =>
					ids[
						target.resource === "documents"
							? `documents:${target.collectionKey}:${target.id}`
							: `${target.resource}:${target.id}`
					] ?? null,
			),
		).toEqual({
			type: "doc",
			content: [
				{ type: "lucidMedia", attrs: { mediaId: 10 } },
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Kept",
							marks: [
								{ ...linked, attrs: { ...linked.attrs, documentId: 20 } },
							],
						},
						{ type: "text", text: "Unlinked", marks: [] },
						{ type: "text", text: "@will" },
						{
							type: "lucidVariable",
							attrs: { source: "user", userId: 40, fieldKey: "name" },
						},
					],
				},
			],
		});
	});

	test("removes embedded bricks by ref", () => {
		expect(
			removeRichTextEmbeddedBricks(
				{
					type: "doc",
					content: [
						{ type: "lucidEmbeddedBrick", attrs: { ref: "kept" } },
						{
							type: "paragraph",
							content: [{ type: "lucidEmbeddedBrick", attrs: { ref: "gone" } }],
						},
					],
				},
				new Set(["gone"]),
			),
		).toEqual({
			type: "doc",
			content: [
				{ type: "lucidEmbeddedBrick", attrs: { ref: "kept" } },
				{ type: "paragraph", content: [] },
			],
		});
	});
});
