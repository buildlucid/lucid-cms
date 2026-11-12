import { describe, expect, test } from "vitest";
import type { JobSchedule } from "../types.js";
import { getDueScheduleOccurrence } from "./occurrences.js";

const schedule = (
	missed: JobSchedule["missed"],
	cron = "0 * * * *",
): JobSchedule => ({
	key: "test",
	cron,
	timezone: "Europe/London",
	input: null,
	overlap: "skip",
	missed,
});

/** Whether a schedule is due at a minute, as a tick on that minute would find it. */
const dueAt = (cron: string, minute: string) =>
	getDueScheduleOccurrence({
		schedule: schedule("skip", cron),
		cursor: new Date(new Date(minute).getTime() - 60_000),
		scheduledAt: new Date(minute),
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

	test("follows its timezone's clock across a daylight saving change", () => {
		expect(dueAt("0 9 * * *", "2031-03-29T09:00:00Z")).toBeDefined();
		expect(dueAt("0 9 * * *", "2031-03-30T08:00:00Z")).toBeDefined();
		expect(dueAt("0 9 * * *", "2031-03-30T09:00:00Z")).toBeUndefined();
	});

	test("runs once on a day the clocks skip or repeat its time", () => {
		//* 01:30 doesn't exist when London's clocks go forward, so it runs at the first minute after
		expect(dueAt("30 1 * * *", "2031-03-30T01:00:00Z")).toBeDefined();
		expect(dueAt("30 1 * * *", "2031-03-30T01:30:00Z")).toBeUndefined();
		//* 01:30 happens twice when they go back, and only the first counts
		expect(dueAt("30 1 * * *", "2031-10-26T00:30:00Z")).toBeDefined();
		expect(dueAt("30 1 * * *", "2031-10-26T01:30:00Z")).toBeUndefined();
	});
});
