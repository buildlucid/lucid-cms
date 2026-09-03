import { CronExpressionParser } from "cron-parser";
import type { JobSchedule } from "../types.js";
import { floorToMinute } from "./cursor.js";

/**
 * Returns at most one due occurrence for the current scheduler tick. A
 * schedule that skips missed occurrences only runs on its exact minute, while
 * one that catches up runs once for anything missed since the last cursor.
 */
export const getDueScheduleOccurrence = (props: {
	schedule: JobSchedule;
	cursor: Date;
	scheduledAt: Date;
}): Date | undefined => {
	const scheduledAt = floorToMinute(props.scheduledAt);
	const occurrence = CronExpressionParser.parse(props.schedule.cron, {
		currentDate: new Date(scheduledAt.getTime() + 1),
		tz: props.schedule.timezone,
	})
		.prev()
		.toDate();

	if (occurrence.getTime() > scheduledAt.getTime()) return undefined;

	if (props.schedule.missed === "skip") {
		return occurrence.getTime() === scheduledAt.getTime()
			? occurrence
			: undefined;
	}

	return occurrence.getTime() > props.cursor.getTime() ? occurrence : undefined;
};

/** Returns the next occurrence after the supplied date. */
export const getNextScheduleOccurrence = (
	schedule: JobSchedule,
	after = new Date(),
) =>
	CronExpressionParser.parse(schedule.cron, {
		currentDate: after,
		tz: schedule.timezone,
	})
		.next()
		.toDate();
