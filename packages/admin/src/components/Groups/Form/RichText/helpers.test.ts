import { describe, expect, test } from "vitest";
import { richTextHasContent } from "./helpers";

describe("richTextHasContent", () => {
	test("treats an empty document as empty", () => {
		expect(
			richTextHasContent({
				type: "doc",
				content: [{ type: "paragraph" }],
			}),
		).toBe(false);
	});

	test("recognises text and reference nodes as content", () => {
		expect(
			richTextHasContent({
				type: "doc",
				content: [
					{ type: "paragraph", content: [{ type: "text", text: "Hello" }] },
				],
			}),
		).toBe(true);
		expect(
			richTextHasContent({
				type: "doc",
				content: [{ type: "lucidMedia", attrs: { mediaId: 1 } }],
			}),
		).toBe(true);
	});
});
