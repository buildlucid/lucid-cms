import { expect, test } from "vitest";
import entryInputs from "./entry-inputs.js";

test("gives entries that would share an input name their own", () => {
	expect(
		entryInputs("/site", [
			"scripts/foo-bar.ts",
			"scripts/foo/bar.ts",
			"scripts/foo-bar.css",
			"styles/site.css",
		]),
	).toEqual({
		"site-scripts-foo-bar": "/site/scripts/foo-bar.ts",
		"site-scripts-foo-bar-2": "/site/scripts/foo/bar.ts",
		"site-scripts-foo-bar-3": "/site/scripts/foo-bar.css",
		"site-styles-site": "/site/styles/site.css",
	});
});
