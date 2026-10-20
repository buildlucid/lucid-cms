import type { RichTextJSON } from "@lucidcms/rich-text";
import { describe, expect, test } from "vitest";
import richText from "./rich-text.js";

/** A rich text field as content reads give it, with its embedded brick filled in. */
const node: RichTextJSON = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "Hello " },
				{ type: "text", text: "world", marks: [{ type: "bold" }] },
			],
		},
		{
			type: "lucidEmbeddedBrick",
			attrs: {
				ref: "e1",
				brick: { id: 3, key: "callout", order: 0, fields: {} },
			},
		},
	],
};

describe("richText", () => {
	test("renders a field as HTML, leaving embedded bricks to templates", () => {
		expect(String(richText(node))).toBe("<p>Hello <strong>world</strong></p>");
	});

	test("renders a single node, such as one a template loop doesn't handle itself", () => {
		expect(String(richText(node.content?.[0]))).toBe(
			"<p>Hello <strong>world</strong></p>",
		);
	});

	test("renders nothing for an empty field", () => {
		expect(String(richText(null))).toBe("");
	});
});
