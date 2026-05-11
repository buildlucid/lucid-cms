import { describe, expect, test } from "vitest";
import { isInSchedulingDispatchWindow, parseScheduleInput } from "./index.js";

describe("Tests for publish operation scheduling helpers", () => {
	test("parses valid schedule input to UTC minute precision", () => {
		const result = parseScheduleInput({
			scheduledAt: "2026-01-01T12:30:00.000Z",
			scheduledTimezone: "Europe/London",
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toMatchObject({
			scheduledAt: "2026-01-01T12:30:00.000Z",
			scheduledTimezone: "Europe/London",
			provided: true,
		});
	});

	test("rejects schedule input without minute precision", () => {
		const result = parseScheduleInput({
			scheduledAt: "2026-01-01T12:30:01.000Z",
			scheduledTimezone: "Europe/London",
		});

		expect(result.error?.status).toBe(400);
	});

	test("rejects invalid schedule timezone input", () => {
		const result = parseScheduleInput({
			scheduledAt: "2026-01-01T12:30:00.000Z",
			scheduledTimezone: "Not/AZone",
		});

		expect(result.error?.status).toBe(400);
	});

	test("treats null scheduledAt as an explicit clear", () => {
		const result = parseScheduleInput({
			scheduledAt: null,
			scheduledTimezone: null,
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toMatchObject({
			scheduledAt: null,
			scheduledTimezone: null,
			provided: true,
		});
	});

	test("detects operations inside the 6-hour dispatch window", () => {
		const now = new Date("2026-01-01T12:00:00.000Z");

		expect(
			isInSchedulingDispatchWindow({
				now,
				scheduledAt: new Date("2026-01-01T17:59:00.000Z"),
			}),
		).toBe(true);
		expect(
			isInSchedulingDispatchWindow({
				now,
				scheduledAt: new Date("2026-01-01T18:01:00.000Z"),
			}),
		).toBe(false);
	});
});
