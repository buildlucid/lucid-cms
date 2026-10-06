import { describe, expect, test } from "vitest";
import formatter from "./helpers.js";

describe("formatDate", () => {
	test("reads zone-less SQLite timestamps as UTC", () => {
		expect(formatter.formatDate("2026-10-04 23:29:25")).toBe(
			"2026-10-04T23:29:25.000Z",
		);
		expect(formatter.formatDate("2026-10-04 23:29:25.123")).toBe(
			"2026-10-04T23:29:25.123Z",
		);
	});

	test("keeps zoned strings and Date objects in UTC ISO format", () => {
		expect(formatter.formatDate("2026-10-04T23:29:25.000Z")).toBe(
			"2026-10-04T23:29:25.000Z",
		);
		expect(formatter.formatDate("2026-10-05T00:29:25+01:00")).toBe(
			"2026-10-04T23:29:25.000Z",
		);
		expect(formatter.formatDate(new Date("2026-10-04T23:29:25Z"))).toBe(
			"2026-10-04T23:29:25.000Z",
		);
	});

	test("returns null for missing dates and unparseable strings as is", () => {
		expect(formatter.formatDate(null)).toBeNull();
		expect(formatter.formatDate(undefined)).toBeNull();
		expect(formatter.formatDate("not a date")).toBe("not a date");
	});
});
