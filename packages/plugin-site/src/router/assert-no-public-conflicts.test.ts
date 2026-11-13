import { describe, expect, test } from "vitest";
import assertNoPublicConflicts from "./assert-no-public-conflicts.js";
import createPageRouter from "./create-page-router.js";

const { pages } = createPageRouter([
	"pages/index.kiln",
	"pages/about.kiln",
	"pages/robots.txt.kiln",
	"pages/blog/[slug].kiln",
]);

describe("assertNoPublicConflicts", () => {
	test("names each page and public file that serve the same path", () => {
		expect(() =>
			assertNoPublicConflicts(pages, [
				{ path: "/robots.txt", file: "public/robots.txt" },
				{ path: "/about/index.html", file: "public/about/index.html" },
			]),
		).toThrow(
			"'/about/index.html': 'pages/about.kiln' and 'public/about/index.html'\n'/robots.txt': 'pages/robots.txt.kiln' and 'public/robots.txt'",
		);
	});

	test("matches paths however they are encoded, as requests reach them", () => {
		const encoded = createPageRouter(["pages/caf%C3%A9.txt.kiln"]).pages;

		expect(() =>
			assertNoPublicConflicts(encoded, [
				{ path: "/café.txt", file: "public/café.txt" },
			]),
		).toThrow(
			"'/caf%C3%A9.txt': 'pages/caf%C3%A9.txt.kiln' and 'public/café.txt'",
		);
	});

	test("allows public files beside pages, and under pages with route parameters", () => {
		expect(() =>
			assertNoPublicConflicts(pages, [
				{ path: "/about.txt", file: "public/about.txt" },
				{ path: "/blog/hello", file: "public/blog/hello" },
			]),
		).not.toThrow();
	});
});
