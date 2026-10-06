import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import { RequestsRepository } from "../../../libs/repositories/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import scheduleRequest, {
	QUEUE_WINDOW_MS,
} from "../helpers/schedule-request.js";

/** Queues scheduled requests once their time is close enough for the queue to hold them. */
export const dispatchScheduledRequestsJob = defineJob({
	name: "core:dispatch-scheduled-requests",
	version: 1,
	input: z.null(),
	schedules: [
		{ name: "automatic", cron: "* * * * *", timezone: "UTC", input: null },
	],
	handler: async ({ context }) => {
		if (!context.queue.support.delayedDelivery) {
			return { error: undefined, data: undefined };
		}

		const Requests = new RequestsRepository(context.db);
		const requestsRes = await Requests.selectMultiple({
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
		if (requestsRes.error) return requestsRes;

		for (const request of requestsRes.data ?? []) {
			const scheduleRes = await serviceWrapper(scheduleRequest, {
				transaction: true,
			})(context, { id: request.id });
			if (scheduleRes.error) return scheduleRes;
		}

		return { error: undefined, data: undefined };
	},
});
