import { Cron } from "croner";
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
	//* croner reads references to the whole second, so looking back from one second later includes scheduledAt
	const [occurrence] = new Cron(props.schedule.cron, {
		timezone: props.schedule.timezone,
	}).previousRuns(1, new Date(scheduledAt.getTime() + 1000));

	if (!occurrence || occurrence.getTime() > scheduledAt.getTime()) {
		return undefined;
	}

	if (props.schedule.missed === "skip") {
		return occurrence.getTime() === scheduledAt.getTime()
			? occurrence
			: undefined;
	}

	return occurrence.getTime() > props.cursor.getTime() ? occurrence : undefined;
};

/** Returns the next occurrence after the supplied date. Config checks reject schedules that never run. */
export const getNextScheduleOccurrence = (
	schedule: JobSchedule,
	after = new Date(),
) => {
	const next = new Cron(schedule.cron, {
		timezone: schedule.timezone,
	}).nextRun(after);
	if (!next) {
		throw new Error(`Schedule "${schedule.cron}" never runs.`);
	}
	return next;
};
