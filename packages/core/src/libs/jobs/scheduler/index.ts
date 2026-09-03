import constants from "../../../constants/constants.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import logger from "../../logger/index.js";
import { JobsRepository } from "../../repositories/index.js";
import { enqueueJob } from "../enqueue.js";
import { advanceSchedulerCursor, readSchedulerCursor } from "./cursor.js";
import { getDueScheduleOccurrence } from "./occurrences.js";
import {
	getRegisteredJobSchedules,
	getScheduleOverrides,
} from "./registered-schedules.js";

/** Enqueues every job due during one scheduler tick. */
const runDueSchedules: ServiceFn<[scheduledAt: Date], undefined> = async (
	context,
	scheduledAt,
) => {
	const cursor = await readSchedulerCursor(context, scheduledAt);
	if (cursor.error) return cursor;

	const overrides = await getScheduleOverrides(context);
	if (overrides.error) return overrides;

	const pausedScheduleKeys = new Set(
		overrides.data.map((override) => override.scheduleKey),
	);
	const Jobs = new JobsRepository(context.db);

	for (const binding of getRegisteredJobSchedules(context)) {
		if (pausedScheduleKeys.has(binding.key)) continue;

		const occurrence = getDueScheduleOccurrence({
			schedule: binding.schedule,
			cursor: cursor.data,
			scheduledAt,
		});
		if (!occurrence) continue;

		const scheduledFor = occurrence.toISOString();
		if (binding.schedule.overlap === "skip") {
			const active = await Jobs.selectActiveScheduleJob({
				scheduleKey: binding.key,
				before: scheduledFor,
			});
			if (active.error) return active;
			if (active.data) {
				logger.debug({
					event: "jobs.schedule.skipped.overlap",
					message:
						"Skipped a scheduled job because an earlier run is still active",
					scope: constants.logScopes.scheduler,
					data: { scheduleKey: binding.key, scheduledFor },
				});
				continue;
			}
		}

		const enqueued = await enqueueJob(context, {
			job: binding.job,
			payload: binding.schedule.input,
			options: {
				//* One durable job per occurrence, however often the tick runs
				idempotencyKey: `${binding.key}:${scheduledFor}`,
				trigger: {
					type: "schedule",
					scheduleKey: binding.key,
					scheduledFor,
				},
			},
		});
		if (enqueued.error) return enqueued;
	}

	const advanced = await advanceSchedulerCursor(context, scheduledAt);
	if (advanced.error) return advanced;

	return { error: undefined, data: undefined };
};

/** Evaluates registered schedules and enqueues each due job once. */
const runJobScheduler = serviceWrapper(runDueSchedules, {
	transaction: true,
	logError: true,
	defaultError: { message: copy("server:core.jobs.scheduler.failed") },
});

export default runJobScheduler;
