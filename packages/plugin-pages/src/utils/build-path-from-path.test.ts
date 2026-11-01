import { expect, test } from "vitest";
import buildPathFromPath from "./build-path-from-path.js";

test("should lowercase the built path", async () => {
	const path = buildPathFromPath({
		parentFields: [],
		targetLocale: "en",
		slug: "About",
	});

	expect(path).toBe("/about");
});

test("should prepend the prefix for top level documents", async () => {
	const path = buildPathFromPath({
		parentFields: [],
		targetLocale: "en",
		slug: "About",
		prefix: "Blog",
	});

	expect(path).toBe("/blog/about");
});

test("should not duplicate the prefix when the parent path already contains it", async () => {
	const path = buildPathFromPath({
		parentFields: [
			{
				_slug: "Parent",
				_path: "/blog/parent",
				_parentPage: null,
				document_id: 1,
				locale: "en",
			},
		],
		targetLocale: "en",
		slug: "Child",
		prefix: "Blog",
	});

	expect(path).toBe("/blog/parent/child");
});
