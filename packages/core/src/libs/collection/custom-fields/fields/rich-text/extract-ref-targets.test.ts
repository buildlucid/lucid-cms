import { expect, test } from "vitest";
import extractRichTextRefTargets from "./extract-ref-targets.js";

test("extracts and deduplicates rich text media and document references", () => {
	expect(
		extractRichTextRefTargets({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "About",
							marks: [
								{
									type: "link",
									attrs: {
										kind: "document",
										collectionKey: "pages",
										documentId: 12,
									},
								},
							],
						},
						{
							type: "lucidVariable",
							attrs: {
								collectionKey: "settings",
								documentId: 2,
								fieldKey: "supportEmail",
							},
						},
					],
				},
				{ type: "lucidMedia", attrs: { mediaId: 42 } },
				{ type: "lucidMedia", attrs: { mediaId: 42 } },
			],
		}),
	).toEqual({
		media: [{ table: "lucid_media", value: 42 }],
		relation: [
			{ table: "lucid_document__pages", value: 12 },
			{ table: "lucid_document__settings", value: 2 },
		],
	});
});

test("ignores malformed and external references", () => {
	expect(
		extractRichTextRefTargets({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "External",
							marks: [
								{
									type: "link",
									attrs: { kind: "external", href: "https://example.com" },
								},
							],
						},
					],
				},
				{ type: "lucidMedia", attrs: { mediaId: "42" } },
			],
		}),
	).toEqual({ media: [], relation: [] });
});
