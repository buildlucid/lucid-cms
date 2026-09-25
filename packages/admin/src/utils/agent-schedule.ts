import T, { getLocale } from "@/translations";

export type SchedulePreset =
	| "hourly"
	| "daily"
	| "weekdays"
	| "weekly"
	| "custom";

export interface Schedule {
	preset: SchedulePreset;
	/** Minute past the hour for hourly schedules. */
	minute: number;
	/** 24-hour "HH:MM" for daily, weekday and weekly schedules. */
	time: string;
	/** 0 is Sunday. */
	day: number;
	/** The raw expression for custom schedules. */
	cron: string;
}

const pad = (value: number) => String(value).padStart(2, "0");
const timeOf = (hour: string, minute: string) =>
	`${pad(Number(hour))}:${pad(Number(minute))}`;

const patterns: [SchedulePreset, RegExp][] = [
	["hourly", /^(\d{1,2}) \* \* \* \*$/],
	["daily", /^(\d{1,2}) (\d{1,2}) \* \* \*$/],
	["weekdays", /^(\d{1,2}) (\d{1,2}) \* \* 1-5$/],
	["weekly", /^(\d{1,2}) (\d{1,2}) \* \* ([0-6])$/],
];

export const defaultSchedule: Schedule = {
	preset: "daily",
	minute: 0,
	time: "09:00",
	day: 1,
	cron: "0 9 * * *",
};

/** Reads a cron expression into the closest editable preset. */
export const parseSchedule = (cron: string): Schedule => {
	const expression = cron.trim().replace(/\s+/g, " ");
	for (const [preset, pattern] of patterns) {
		const match = expression.match(pattern);
		if (!match) continue;
		const [, minute = "0", hour = "0", day = "1"] = match;
		return {
			...defaultSchedule,
			preset,
			minute: Number(minute),
			time: timeOf(hour, minute),
			day: Number(day),
			cron: expression,
		};
	}
	return { ...defaultSchedule, preset: "custom", cron: expression };
};

export const toCron = (schedule: Schedule) => {
	const [hour = "0", minute = "0"] = schedule.time.split(":");
	const at = `${Number(minute)} ${Number(hour)}`;
	switch (schedule.preset) {
		case "hourly":
			return `${schedule.minute} * * * *`;
		case "daily":
			return `${at} * * *`;
		case "weekdays":
			return `${at} * * 1-5`;
		case "weekly":
			return `${at} * * ${schedule.day}`;
		case "custom":
			return schedule.cron.trim();
	}
};

/** The localised name of a weekday, where 0 is Sunday. */
export const weekdayName = (day: number) =>
	new Intl.DateTimeFormat(getLocale(), {
		weekday: "long",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(2024, 0, 7 + day)));

/** Describes a schedule in plain words, such as "Every weekday at 09:00". */
export const describeSchedule = (cron: string) => {
	const schedule = parseSchedule(cron);
	switch (schedule.preset) {
		case "hourly":
			return T()("agent.schedule.describe.hourly", {
				minute: pad(schedule.minute),
			});
		case "daily":
			return T()("agent.schedule.describe.daily", { time: schedule.time });
		case "weekdays":
			return T()("agent.schedule.describe.weekdays", { time: schedule.time });
		case "weekly":
			return T()("agent.schedule.describe.weekly", {
				day: weekdayName(schedule.day),
				time: schedule.time,
			});
		case "custom":
			return schedule.cron;
	}
};
