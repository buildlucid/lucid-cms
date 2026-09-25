import { describe, expect, it } from "vitest";
import { parseSchedule, toCron } from "./agent-schedule";

describe("agent schedules", () => {
	it.each([
		["15 * * * *", "hourly"],
		["0 9 * * *", "daily"],
		["30 8 * * 1-5", "weekdays"],
		["0 17 * * 5", "weekly"],
		["0 9 1 * *", "custom"],
	])("reads %s as %s and writes it back unchanged", (cron, preset) => {
		const schedule = parseSchedule(cron);
		expect(schedule.preset).toBe(preset);
		expect(toCron(schedule)).toBe(cron);
	});

	it("builds a weekly expression from a time and day", () => {
		expect(
			toCron({ ...parseSchedule("0 9 * * *"), preset: "weekly", day: 2 }),
		).toBe("0 9 * * 2");
	});
});
