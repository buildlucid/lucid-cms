import { expect, test } from "vitest";
import isWebSourceAllowed from "./is-web-source-allowed.js";

test("allowed domains include subdomains without matching a suffix lookalike", () => {
	expect(
		isWebSourceAllowed("https://docs.example.com/page", ["example.com"]),
	).toBe(true);
	expect(isWebSourceAllowed("https://notexample.com", ["example.com"])).toBe(
		false,
	);
	expect(
		isWebSourceAllowed("https://example.com.other.com", ["example.com"]),
	).toBe(false);
});
