import { describe, expect, test } from "vitest";
import createPageRouter from "../router/create-page-router.js";
import findCanonicalPath from "./find-canonical-path.js";

const { router } = createPageRouter([
	"pages/index.kiln",
	"pages/about.kiln",
	"pages/robots.txt.kiln",
]);

const canonical = (pathname: string, trailingSlash: "never" | "always") =>
	findCanonicalPath({ pathname, router, trailingSlash });

describe("findCanonicalPath", () => {
	test("redirects HTML pages to the form the option chooses, collapsing repeated slashes", () => {
		expect(canonical("/about", "never")).toBeNull();
		expect(canonical("/about/", "never")).toBe("/about");
		expect(canonical("//about//", "never")).toBe("/about");

		expect(canonical("/about/", "always")).toBeNull();
		expect(canonical("/about", "always")).toBe("/about/");
	});

	test("leaves the root, other content types and unknown pages alone", () => {
		expect(canonical("/", "never")).toBeNull();
		expect(canonical("/", "always")).toBeNull();
		expect(canonical("/robots.txt/", "never")).toBeNull();
		expect(canonical("/robots.txt", "always")).toBeNull();
		expect(canonical("/missing/", "never")).toBeNull();
	});
});
