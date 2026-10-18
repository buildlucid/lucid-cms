import type { CollectionDocument } from "@lucidcms/core/types";
import { describe, expect, test } from "vitest";
import toTemplateRichText from "../content/to-template-rich-text.js";
import richText from "./rich-text.js";

const json = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "Hello " },
				{ type: "text", text: "world", marks: [{ type: "bold" }] },
			],
		},
		{ type: "lucidEmbeddedBrick", attrs: { ref: "e1" } },
	],
};

const node = toTemplateRichText(
	json,
	{ document: { bricks: [] } as unknown as CollectionDocument, refs: {} },
	{ brick: () => null, document: () => null },
);

describe("richText", () => {
	test("renders a field as HTML, leaving embedded bricks to templates", () => {
		expect(String(richText(node))).toBe("<p>Hello <strong>world</strong></p>");
	});

	test("renders a single node, such as one a template loop doesn't handle itself", () => {
		expect(String(richText(node?.content[0]))).toBe(
			"<p>Hello <strong>world</strong></p>",
		);
	});

	test("renders nothing for an empty field", () => {
		expect(String(richText(null))).toBe("");
	});
});
