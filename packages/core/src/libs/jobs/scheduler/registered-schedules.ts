import type {
	ServiceContext,
	ServiceFn,
} from "../../../utils/services/types.js";
import { JobScheduleOverridesRepository } from "../../repositories/index.js";
import { getJobRegistry } from "../registry.js";
import type { AnyJobDefinition, JobSchedule } from "../types.js";

/** A schedule paired with the registered job definition that declares it. */
export type RegisteredJobSchedule = {
	readonly key: string;
	readonly job: AnyJobDefinition;
	readonly schedule: JobSchedule;
};

/** An explicit pause stored against a registered schedule. */
export type JobScheduleOverride = {
	scheduleKey: string;
	pausedAt: string | Date;
	pausedByUserId: number | null;
};

/** Returns schedules from the latest registered version of each job. */
export const getRegisteredJobSchedules = (
	context: Pick<ServiceContext, "config">,
): readonly RegisteredJobSchedule[] => {
	const activeJobs = new Map<string, AnyJobDefinition>();
	for (const job of getJobRegistry(context.config).values()) {
		const current = activeJobs.get(job.name);
		if (!current || job.version > current.version) {
			activeJobs.set(job.name, job);
		}
	}

	return [...activeJobs.values()].flatMap((job) =>
		job.schedules.map((schedule) => ({
			key: `${job.name}/${schedule.name}`,
			job,
			schedule,
		})),
	);
};

/** Finds a registered schedule by its `<job name>/<schedule name>` key. */
export const getRegisteredJobSchedule = (
	context: Pick<ServiceContext, "config">,
	scheduleKey: string,
) =>
	getRegisteredJobSchedules(context).find(
		(schedule) => schedule.key === scheduleKey,
	);

/** Resolves a full schedule key, or the first schedule attached to a job name. */
export const resolveRegisteredJobSchedule = (
	schedules: readonly RegisteredJobSchedule[],
	reference: string,
) =>
	schedules.find((schedule) => schedule.key === reference) ??
	schedules.find((schedule) => schedule.job.name === reference);

/** Returns the explicit pause overrides stored for registered schedules. */
export const getScheduleOverrides: ServiceFn<
	[],
	JobScheduleOverride[]
> = async (context) => {
	const Overrides = new JobScheduleOverridesRepository(context.db);

	const overrides = await Overrides.selectMultiple({
		select: ["schedule_key", "paused_at", "paused_by_user_id"],
		validation: { enabled: true },
	});
	if (overrides.error) return overrides;

	return {
		error: undefined,
		data: overrides.data.map((override) => ({
			scheduleKey: override.schedule_key,
			pausedAt: override.paused_at,
			pausedByUserId: override.paused_by_user_id,
		})),
	};
};
