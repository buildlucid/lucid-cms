import { jobsFormatter } from "../../libs/formatters/index.js";
import { getNextScheduleOccurrence } from "../../libs/jobs/scheduler/occurrences.js";
import {
	getRegisteredJobSchedules,
	getScheduleOverrides,
} from "../../libs/jobs/scheduler/registered-schedules.js";
import { JobsRepository } from "../../libs/repositories/index.js";
import type { GetSchedulesQueryParams } from "../../schemas/jobs.js";
import type { JobScheduleSummary } from "../../types/response.js";
import { queryRecords } from "../../utils/in-memory-query/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Returns registered schedules with their next run and latest job. */
const getSchedules: ServiceFn<
	[{ query: GetSchedulesQueryParams }],
	{ data: JobScheduleSummary[]; count: number }
> = async (context, data) => {
	const now = new Date();
	const bindings = getRegisteredJobSchedules(context);
	const scheduleKeys = bindings.map((binding) => binding.key);

	const Jobs = new JobsRepository(context.db);

	const latestPromise =
		scheduleKeys.length === 0
			? Promise.resolve({ error: undefined, data: [] } as const)
			: Jobs.selectLatestByScheduleKeys(scheduleKeys);

	const [latest, overrides] = await Promise.all([
		latestPromise,
		getScheduleOverrides(context),
	]);
	if (latest.error) return latest;
	if (overrides.error) return overrides;

	const latestBySchedule = new Map(
		latest.data.flatMap((job) =>
			job.schedule_key === null ? [] : [[job.schedule_key, job] as const],
		),
	);
	const overridesBySchedule = new Map(
		overrides.data.map((override) => [override.scheduleKey, override]),
	);
	const schedules = bindings.map((binding) =>
		jobsFormatter.formatSchedule({
			binding,
			nextRunAt: getNextScheduleOccurrence(binding.schedule, now),
			lastRun: latestBySchedule.get(binding.key),
			override: overridesBySchedule.get(binding.key),
		}),
	);

	const queried = queryRecords({
		records: schedules,
		query: data.query,
		fields: {
			key: { get: (schedule) => schedule.key },
			name: { get: (schedule) => schedule.name, defaultOperator: "contains" },
			jobName: {
				get: (schedule) => schedule.jobName,
				defaultOperator: "contains",
			},
			jobVersion: { get: (schedule) => schedule.jobVersion },
			cron: { get: (schedule) => schedule.cron, defaultOperator: "contains" },
			timezone: {
				get: (schedule) => schedule.timezone,
				defaultOperator: "contains",
			},
			state: { get: (schedule) => schedule.state },
			overlap: { get: (schedule) => schedule.overlap },
			missed: { get: (schedule) => schedule.missed },
			nextRunAt: { get: (schedule) => schedule.nextRunAt },
			pausedAt: { get: (schedule) => schedule.pausedAt },
		},
	});

	return { error: undefined, data: queried };
};

export default getSchedules;
