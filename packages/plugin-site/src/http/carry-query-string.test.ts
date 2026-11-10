import { describe, expect, test } from "vitest";
import carryQueryString from "./carry-query-string.js";

describe("carrying the query string to a redirect", () => {
	test("puts it before the target's fragment", () => {
		expect(carryQueryString("/new#section", "?ref=1")).toBe(
			"/new?ref=1#section",
		);
	});

	test("keeps a query string the target sets itself", () => {
		expect(carryQueryString("/new?tab=2#section", "?ref=1")).toBe(
			"/new?tab=2#section",
		);
	});
});
