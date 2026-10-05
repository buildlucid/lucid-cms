import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import { ReleasesRepository } from "../../../libs/repositories/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import scheduleRelease, {
	QUEUE_WINDOW_MS,
} from "../helpers/schedule-release.js";

/** Queues scheduled releases once their time is close enough for the queue to hold them. */
export const dispatchScheduledReleasesJob = defineJob({
	name: "core:dispatch-scheduled-releases",
	version: 1,
	input: z.null(),
	schedules: [
		{ name: "automatic", cron: "* * * * *", timezone: "UTC", input: null },
	],
	handler: async ({ context }) => {
		if (!context.queue.support.delayedDelivery) {
			return { error: undefined, data: undefined };
		}

		const Releases = new ReleasesRepository(context.db);
		const releasesRes = await Releases.selectMultiple({
			select: ["id"],
			where: [
				{ key: "status", operator: "=", value: "open" },
				{ key: "execution_job_id", operator: "is", value: null },
				{ key: "failure", operator: "is", value: null },
				{
					key: "scheduled_at",
					operator: "<=",
					value: new Date(Date.now() + QUEUE_WINDOW_MS).toISOString(),
				},
			],
		});
		if (releasesRes.error) return releasesRes;

		for (const release of releasesRes.data ?? []) {
			const scheduleRes = await serviceWrapper(scheduleRelease, {
				transaction: true,
			})(context, { id: release.id });
			if (scheduleRes.error) return scheduleRes;
		}

		return { error: undefined, data: undefined };
	},
});
