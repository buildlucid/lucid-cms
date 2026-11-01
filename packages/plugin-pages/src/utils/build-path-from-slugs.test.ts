import { expect, test } from "vitest";
import type { PageVersionFields } from "../services/get-pages-fields.js";
import buildPathFromSlugs from "./build-path-from-slugs.js";

const descendants: Array<PageVersionFields> = [
	{
		document_id: 1,
		document_version_id: 101,
		rows: [
			{
				locale: "en",
				_slug: "Test",
				_path: null,
				_parentPage: 2,
			},
		],
	},
	{
		document_id: 2,
		document_version_id: 102,
		rows: [
			{
				locale: "en",
				_slug: "Parent",
				_path: null,
				_parentPage: 3,
			},
		],
	},
	{
		document_id: 3,
		document_version_id: 103,
		rows: [
			{
				locale: "en",
				_slug: "Grandparent",
				_path: null,
				_parentPage: null,
			},
		],
	},
];

test("should return correctly formatted and built path", async () => {
	const testPath = buildPathFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[0] as PageVersionFields,
		descendants: descendants,
		topLevelPath: undefined,
	});

	const grandparentPath = buildPathFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[2] as PageVersionFields,
		descendants: descendants,
		topLevelPath: undefined,
	});

	expect(testPath).toBe("/grandparent/parent/test");
	expect(grandparentPath).toBe("/grandparent");
});

test("should prepend topLevelPath to path if it exists", async () => {
	const testPath = buildPathFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[0] as PageVersionFields,
		descendants: descendants,
		topLevelPath: "/top-level",
	});

	const grandparentPath = buildPathFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[2] as PageVersionFields,
		descendants: descendants,
		topLevelPath:
			"//top-level" /* double slashes to test that they are removed */,
	});

	expect(testPath).toBe("/top-level/grandparent/parent/test");
	expect(grandparentPath).toBe("/top-level/grandparent");
});
