import { expect, test } from "vitest";
import buildFullSlugFromSlugs from "./build-fullslug-from-slugs.js";
import type { DescendantFieldsResponse } from "../services/get-descendant-fields.js";

const descendants: Array<DescendantFieldsResponse> = [
	{
		document_id: 1,
		document_version_id: 101,
		rows: [
			{
				locale: "en",
				_slug: "test",
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
				_slug: "parent",
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
				_slug: "grandparent",
				_fullSlug: null,
				_parentPage: null,
			},
		],
	},
];

test("should return correctly formatted and built fullSlug", async () => {
	const testFullSlug = buildFullSlugFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[0] as DescendantFieldsResponse,
		descendants: descendants,
		topLevelFullSlug: undefined,
	});

	const grandparentFullSlug = buildFullSlugFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[2] as DescendantFieldsResponse,
		descendants: descendants,
		topLevelFullSlug: undefined,
	});

	expect(testFullSlug).toBe("/grandparent/parent/test");
	expect(grandparentFullSlug).toBe("/grandparent");
});

test("should prepend topLevelFullSlug to fullSlug if it exists", async () => {
	const testFullSlug = buildFullSlugFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[0] as DescendantFieldsResponse,
		descendants: descendants,
		topLevelFullSlug: "/top-level",
	});

	const grandparentFullSlug = buildFullSlugFromSlugs({
		targetLocale: "en",
		currentDescendant: descendants[2] as DescendantFieldsResponse,
		descendants: descendants,
		topLevelFullSlug:
			"//top-level" /* double slashes to test that they are removed */,
	});

	expect(testFullSlug).toBe("/top-level/grandparent/parent/test");
	expect(grandparentFullSlug).toBe("/top-level/grandparent");
});
