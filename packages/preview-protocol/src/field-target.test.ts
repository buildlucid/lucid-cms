import { describe, expect, test } from "vitest";
import {
	decodePreviewFieldTarget,
	encodePreviewFieldTarget,
	type PreviewFieldTarget,
} from "./index.js";
import { isPreviewFieldTarget } from "./validators.js";

const targets: PreviewFieldTarget[] = [
	{ collectionKey: "page", documentId: 1, path: ["title"] },
	{
		collectionKey: "page",
		documentId: 1,
		brick: { type: "fixed", key: "seo", order: -1 },
		path: ["heading"],
		locale: "en",
	},
	{
		collectionKey: "page",
		documentId: 1,
		path: ["sections", 2, "heading"],
	},
	{
		collectionKey: "page",
		documentId: 1,
		brick: { type: "builder", key: "content", order: 2 },
		path: ["sections", 0, "links", 3, "label"],
	},
];

describe("preview field targets", () => {
	test.each(targets)("round trips %#", (target) => {
		const encoded = encodePreviewFieldTarget(target);
		expect(encoded).toMatch(/^1:/);
		expect(decodePreviewFieldTarget(encoded ?? "")).toEqual(target);
	});

	test("rejects malformed targets, unsafe indexes, depth, and size limits", () => {
		expect(isPreviewFieldTarget(null)).toBe(false);
		expect(isPreviewFieldTarget({ ...targets[0], documentId: 1.5 })).toBe(
			false,
		);
		expect(isPreviewFieldTarget({ ...targets[0], path: ["items", -1] })).toBe(
			false,
		);
		expect(
			isPreviewFieldTarget({
				...targets[0],
				path: Array.from({ length: 33 }, () => "nested"),
			}),
		).toBe(false);
		expect(
			isPreviewFieldTarget({ ...targets[0], path: ["x".repeat(129)] }),
		).toBe(false);
		expect(isPreviewFieldTarget({ ...targets[0], extra: "x" })).toBe(false);
		expect(
			isPreviewFieldTarget({
				...targets[0],
				brick: { type: "builder", key: "content", order: 1, extra: true },
			}),
		).toBe(false);
		expect(
			isPreviewFieldTarget({
				...targets[0],
				brick: { type: "builder", key: "content", order: -2 },
			}),
		).toBe(false);
		expect(decodePreviewFieldTarget("2:%7B%7D")).toBeNull();
		expect(decodePreviewFieldTarget("1:%not-json")).toBeNull();
		expect(decodePreviewFieldTarget(`1:${"x".repeat(4096)}`)).toBeNull();
	});
});
