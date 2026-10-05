import { describe, expect, it } from "vitest";
import { getScheduledAt, getScheduleFields } from "./release-schedule";

describe("release schedules", () => {
	it("converts the selected zone to UTC and preserves it when editing", () => {
		const scheduledAt = getScheduledAt({
			date: "2026-07-12",
			time: "14:30",
			timezone: "Europe/London",
		});
		expect(scheduledAt).toBe("2026-07-12T13:30:00.000Z");
		expect(getScheduleFields(scheduledAt, "Europe/London")).toEqual({
			date: "2026-07-12",
			time: "14:30",
			timezone: "Europe/London",
		});
	});
	it("handles fractional UTC offsets", () => {
		expect(
			getScheduledAt({
				date: "2026-12-12",
				time: "10:00",
				timezone: "Asia/Kolkata",
			}),
		).toBe("2026-12-12T04:30:00.000Z");
	});
	it("rejects invalid calendar times and DST gaps", () => {
		expect(
			getScheduledAt({ date: "2026-02-30", time: "14:30", timezone: "UTC" }),
		).toBeNull();
		expect(
			getScheduledAt({
				date: "2026-03-29",
				time: "01:30",
				timezone: "Europe/London",
			}),
		).toBeNull();
		expect(
			getScheduledAt({ date: "2026-07-12", time: "24:00", timezone: "UTC" }),
		).toBeNull();
		expect(
			getScheduledAt({
				date: "2026-07-12",
				time: "14:30",
				timezone: "bad-zone",
			}),
		).toBeNull();
	});
});
