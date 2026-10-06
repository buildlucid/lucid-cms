import { describe, expect, test } from "vitest";
import dateHelpers from "./date-helpers";

describe("formatRelativeDate", () => {
	const now = new Date(2026, 9, 6, 9, 30).getTime();
	const ago = (date: Date) =>
		dateHelpers.formatRelativeDate(date.toISOString(), now);

	test("uses minutes and hours within the same day", () => {
		expect(ago(new Date(2026, 9, 6, 9, 30, 20))).toBe("now");
		expect(ago(new Date(2026, 9, 6, 9, 24))).toBe("6 minutes ago");
		expect(ago(new Date(2026, 9, 6, 6, 0))).toBe("3 hours ago");
	});

	test("counts calendar days, then weeks", () => {
		expect(ago(new Date(2026, 9, 5, 23, 50))).toBe("yesterday");
		expect(ago(new Date(2026, 9, 4, 11, 0))).toBe("2 days ago");
		expect(ago(new Date(2026, 8, 20, 9, 0))).toBe("2 weeks ago");
	});
});
