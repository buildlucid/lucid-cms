import { describe, expect, test } from "vitest";
import isSafeRedirect from "./is-safe-redirect.js";

describe("isSafeRedirect", () => {
	test.for([
		"/thanks",
		"/thanks?from=contact",
		"https://example.com/thanks",
		"http://localhost:3000/",
	])("takes %s", (url) => {
		expect(isSafeRedirect(url)).toBe(true);
	});

	test.for([
		"javascript:alert(1)",
		" JavaScript:alert(1)",
		"data:text/html,<script>alert(1)</script>",
		"//other.example/thanks",
		"/\\other.example",
		"/\t/other.example/thanks",
		"/\n\\other.example",
		"https://example.com/a\tb",
		"thanks",
		"mailto:team@example.com",
		"",
	])("refuses %s", (url) => {
		expect(isSafeRedirect(url)).toBe(false);
	});
});
