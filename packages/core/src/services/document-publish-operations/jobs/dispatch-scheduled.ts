import z from "zod";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import { DocumentPublishOperationsRepository } from "../../../libs/repositories/index.js";
import { schedulingDispatchWindowMs } from "../helpers/index.js";
import scheduleApproved from "../schedule-approved.js";

const dispatchScheduled: JobHandler = async ({ context }) => {
	if (!context.queue.support.delayedDelivery) {
		return { error: undefined, data: undefined };
	}

	const Operations = new DocumentPublishOperationsRepository(context.db);
	const dispatchBefore = new Date(
		Date.now() + schedulingDispatchWindowMs,
	).toISOString();

	const operationsRes = await Operations.selectMultiple({
		select: ["id"],
		where: [
			{ key: "status", operator: "=", value: "approved" },
			{ key: "execution_status", operator: "=", value: "scheduled" },
			{ key: "scheduled_job_id", operator: "is", value: null },
			{ key: "scheduled_at", operator: "<=", value: dispatchBefore },
		],
	});
	if (operationsRes.error) return operationsRes;

	const scheduleResults = await Promise.all(
		(operationsRes.data ?? []).map((operation) =>
			scheduleApproved(context, {
				id: operation.id,
				eventType: "scheduled",
			}),
		),
	);

	for (const scheduleRes of scheduleResults) {
		if (scheduleRes.error) return scheduleRes;
	}

	return { error: undefined, data: undefined };
};

/**
 * Hands approved publish operations to the queue once their scheduled time
 * falls inside the adapter's delayed delivery window.
 */
export const dispatchScheduledPublishOperationsJob = defineJob({
	name: "core:dispatch-scheduled-publish-operations",
	version: 1,
	input: z.null(),
	schedules: [
		{
			name: "automatic",
			cron: "0 * * * *",
			timezone: "UTC",
			input: null,
		},
	],
	handler: dispatchScheduled,
});
