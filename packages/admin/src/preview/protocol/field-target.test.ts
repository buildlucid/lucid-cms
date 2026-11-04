import { describe, expect, test } from "vitest";
import { decodePreviewFieldTarget, type PreviewFieldTarget } from "./index.js";
import { isPreviewFieldTarget } from "./validators.js";

const targets: PreviewFieldTarget[] = [
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
		path: ["sections", 2, "heading"],
	},
	{
		collectionKey: "page",
		documentId: 1,
		brick: { type: "builder", key: "content", ref: "content-ref" },
		path: ["sections", 0, "links", 3, "label"],
	},
	{
		collectionKey: "page",
		documentId: 1,
		brick: { type: "builder", key: "content", ref: "content-ref" },
		path: [],
	},
];

//* the markup `@lucidcms/client`'s `previewAttributes` writes
const markup = (target: PreviewFieldTarget) =>
	`1:${encodeURIComponent(JSON.stringify(target))}`;

describe("preview field targets", () => {
	test.each(targets)("decodes client markup %#", (target) => {
		expect(decodePreviewFieldTarget(markup(target))).toEqual(target);
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
				brick: { type: "builder", key: "content", ref: "a", extra: true },
			}),
		).toBe(false);
		expect(
			isPreviewFieldTarget({
				...targets[0],
				brick: { type: "builder", key: "content", ref: "" },
			}),
		).toBe(false);
		//* only bricks can be targeted without a path
		expect(isPreviewFieldTarget({ ...targets[0], path: [] })).toBe(false);
		expect(decodePreviewFieldTarget("2:%7B%7D")).toBeNull();
		expect(decodePreviewFieldTarget("1:%not-json")).toBeNull();
		expect(decodePreviewFieldTarget(`1:${"x".repeat(4096)}`)).toBeNull();
	});
});
