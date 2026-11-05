import { encodeEditMarkup } from "@lucidcms/client/contract";
import { describe, expect, test } from "vitest";
import type { PreviewTarget } from "./types.js";
import { decodePreviewTarget, isPreviewTarget } from "./validators.js";

const targets: PreviewTarget[] = [
	{ collectionKey: "page", documentId: 1, path: ["title"] },
	{
		collectionKey: "page",
		documentId: 1,
		brick: { type: "fixed", key: "seo", ref: "seo-ref" },
		path: ["heading"],
		locale: "en",
	},
	{
		collectionKey: "page",
		documentId: 1,
		path: ["sections", { ref: "third" }, "heading"],
	},
	{
		collectionKey: "page",
		documentId: 1,
		brick: { type: "builder", key: "content", ref: "content-ref" },
		path: ["sections", { ref: "first" }, "links", { ref: "fourth" }, "label"],
	},
	{
		collectionKey: "page",
		documentId: 1,
		brick: { type: "builder", key: "content", ref: "content-ref" },
		path: [],
	},
];

describe("preview targets", () => {
	test.each(targets)("decodes client markup %#", (target) => {
		expect(decodePreviewTarget(encodeEditMarkup(target) ?? "")).toEqual(target);
	});

	test("rejects malformed targets, unsafe indexes, depth, and size limits", () => {
		expect(isPreviewTarget(null)).toBe(false);
		expect(isPreviewTarget({ ...targets[0], documentId: 1.5 })).toBe(false);
		expect(isPreviewTarget({ ...targets[0], path: ["items", 1] })).toBe(false);
		expect(
			isPreviewTarget({ ...targets[0], path: ["items", { ref: "" }] }),
		).toBe(false);
		expect(
			isPreviewTarget({
				...targets[0],
				path: Array.from({ length: 33 }, () => "nested"),
			}),
		).toBe(false);
		expect(isPreviewTarget({ ...targets[0], path: ["x".repeat(129)] })).toBe(
			false,
		);
		expect(isPreviewTarget({ ...targets[0], extra: "x" })).toBe(false);
		expect(
			isPreviewTarget({
				...targets[0],
				brick: { type: "builder", key: "content", ref: "a", extra: true },
			}),
		).toBe(false);
		expect(
			isPreviewTarget({
				...targets[0],
				brick: { type: "builder", key: "content", ref: "" },
			}),
		).toBe(false);
		//* only bricks can be targeted without a path
		expect(isPreviewTarget({ ...targets[0], path: [] })).toBe(false);
		expect(decodePreviewTarget("2:%7B%7D")).toBeNull();
		expect(decodePreviewTarget("1:%not-json")).toBeNull();
		expect(decodePreviewTarget(`1:${"x".repeat(4096)}`)).toBeNull();
	});
});
