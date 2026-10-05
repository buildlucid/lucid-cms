import { expect, test } from "vitest";
import type { PageVersionFields } from "../services/get-pages-fields.js";
import buildFullSlugFromSlugs from "./build-fullslug-from-slugs.js";

const descendants: Array<PageVersionFields> = [
	{
		document_id: 1,
		document_version_id: 101,
		rows: [
			{
				locale: "en",
				_slug: "Test",
				_fullSlug: null,
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
				_fullSlug: null,
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
				_fullSlug: null,
				_parentPage: null,
			},
		],
	},
];

test("should return correctly formatted and built fullSlug", async () => {
	const testFullSlug = buildFullSlugFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[0] as PageVersionFields,
		descendants: descendants,
		topLevelFullSlug: undefined,
	});

	const grandparentFullSlug = buildFullSlugFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[2] as PageVersionFields,
		descendants: descendants,
		topLevelFullSlug: undefined,
	});

	expect(testFullSlug).toBe("/grandparent/parent/test");
	expect(grandparentFullSlug).toBe("/grandparent");
});

test("should prepend topLevelFullSlug to fullSlug if it exists", async () => {
	const testFullSlug = buildFullSlugFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[0] as PageVersionFields,
		descendants: descendants,
		topLevelFullSlug: "/top-level",
	});

	const grandparentFullSlug = buildFullSlugFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[2] as PageVersionFields,
		descendants: descendants,
		topLevelFullSlug:
			"//top-level" /* double slashes to test that they are removed */,
	});

	expect(testFullSlug).toBe("/top-level/grandparent/parent/test");
	expect(grandparentFullSlug).toBe("/top-level/grandparent");
});
