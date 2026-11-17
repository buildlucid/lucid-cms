import { describe, expect, test } from "vitest";
import parseTimestamp from "./parse-timestamp.js";

describe("parseTimestamp", () => {
	const time = Date.UTC(2026, 10, 14, 23, 0, 0);

	test("reads SQLite's own format as UTC, the same moment as its ISO form", () => {
		expect(parseTimestamp("2026-11-14 23:00:00")).toBe(time);
		expect(parseTimestamp("2026-11-14T23:00:00.000Z")).toBe(time);
		expect(parseTimestamp(new Date(time))).toBe(time);
	});

	test("gives null for what isn't a date", () => {
		expect(parseTimestamp(null)).toBeNull();
		expect(parseTimestamp("soon")).toBeNull();
	});
});
