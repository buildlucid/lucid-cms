import { describe, expect, test } from "vitest";
import type { JobSchedule } from "../types.js";
import { getDueScheduleOccurrence } from "./occurrences.js";

const schedule = (missed: JobSchedule["missed"]): JobSchedule => ({
	name: "hourly",
	cron: "0 * * * *",
	timezone: "Europe/London",
	input: null,
	overlap: "skip",
	missed,
});

describe("getDueScheduleOccurrence", () => {
	test("is due on its exact minute", () => {
		expect(
			getDueScheduleOccurrence({
				schedule: schedule("skip"),
				cursor: new Date("2026-10-30T18:59:00Z"),
				scheduledAt: new Date("2026-10-30T19:00:20Z"),
			}),
		).toEqual(new Date("2026-10-30T19:00:00Z"));
	});

	test("runs a missed occurrence once, unless missed occurrences are skipped", () => {
		const props = {
			cursor: new Date("2026-10-30T18:30:00Z"),
			scheduledAt: new Date("2026-10-30T19:05:00Z"),
		};

		expect(
			getDueScheduleOccurrence({ ...props, schedule: schedule("run-once") }),
		).toEqual(new Date("2026-10-30T19:00:00Z"));
		expect(
			getDueScheduleOccurrence({ ...props, schedule: schedule("skip") }),
		).toBeUndefined();
		expect(
			getDueScheduleOccurrence({
				schedule: schedule("run-once"),
				cursor: new Date("2026-10-30T19:00:00Z"),
				scheduledAt: new Date("2026-10-30T19:05:00Z"),
			}),
		).toBeUndefined();
	});
});
