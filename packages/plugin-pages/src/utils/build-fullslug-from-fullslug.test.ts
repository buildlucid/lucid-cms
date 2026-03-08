import { expect, test } from "vitest";
import buildFullSlugFromFullSlug from "./build-fullslug-from-fullslug.js";

test("should lowercase the built fullSlug", async () => {
	const fullSlug = buildFullSlugFromFullSlug({
		parentFields: [],
		targetLocale: "en",
		slug: "About",
	});

	expect(fullSlug).toBe("/about");
});

test("should prepend the prefix for top level documents", async () => {
	const fullSlug = buildFullSlugFromFullSlug({
		parentFields: [],
		targetLocale: "en",
		slug: "About",
		prefix: "Blog",
	});

	expect(fullSlug).toBe("/blog/about");
});

test("should not duplicate the prefix when the parent fullSlug already contains it", async () => {
	const fullSlug = buildFullSlugFromFullSlug({
		parentFields: [
			{
				_slug: "Parent",
				_fullSlug: "/blog/parent",
				_parentPage: null,
				document_id: 1,
				locale: "en",
			},
		],
		targetLocale: "en",
		slug: "Child",
		prefix: "Blog",
	});

	expect(fullSlug).toBe("/blog/parent/child");
});
