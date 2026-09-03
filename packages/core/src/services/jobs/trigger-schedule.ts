import { copy } from "../../libs/i18n/index.js";
import { enqueueJob } from "../../libs/jobs/enqueue.js";
import { getRegisteredJobSchedule } from "../../libs/jobs/scheduler/registered-schedules.js";
import type { JobReceipt } from "../../libs/jobs/types.js";
import { JobsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Enqueues a registered schedule immediately, outside its cron timing. */
const triggerSchedule: ServiceFn<
	[{ scheduleKey: string; userId?: number }],
	JobReceipt
> = async (context, data) => {
	const binding = getRegisteredJobSchedule(context, data.scheduleKey);
	if (!binding) {
		return {
			error: {
				message: copy("server:core.jobs.schedule.not.found", {
					data: { schedule: data.scheduleKey },
				}),
				status: 404,
			},
			data: undefined,
		};
	}

	if (binding.schedule.overlap === "skip") {
		const Jobs = new JobsRepository(context.db);

		const active = await Jobs.selectActiveScheduleJob({
			scheduleKey: binding.key,
		});
		if (active.error) return active;
		if (active.data) {
			return {
				error: {
					message: copy("server:core.jobs.schedule.overlap", {
						data: { schedule: data.scheduleKey },
					}),
					status: 409,
				},
				data: undefined,
			};
		}
	}

	const enqueued = await enqueueJob(context, {
		job: binding.job,
		payload: binding.schedule.input,
		options: {
			createdByUserId: data.userId,
			trigger: {
				type: "schedule",
				scheduleKey: binding.key,
				scheduledFor: new Date().toISOString(),
			},
		},
	});
	if (enqueued.error) return enqueued;

	return { error: undefined, data: enqueued.data };
};

export default triggerSchedule;
