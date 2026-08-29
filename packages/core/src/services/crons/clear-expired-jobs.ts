import { subDays } from "date-fns";
import type { ServiceFn } from "../../utils/services/types.js";

/** Removes terminal job history after its configured observability window. */
const clearExpiredJobs: ServiceFn<[], undefined> = async (context) => {
	const completedBefore = subDays(
		new Date(),
		context.config.queue.retention.completedDays,
	).toISOString();
	const failedBefore = subDays(
		new Date(),
		context.config.queue.retention.failedDays,
	).toISOString();

	const completed = await context.db
		.query("queue.jobs.retention.completed", (db) =>
			db
				.deleteFrom("lucid_queue_jobs")
				.where("status", "=", "completed")
				.where("completed_at", "<", completedBefore),
		)
		.first();
	if (completed.error) return completed;

	const failed = await context.db
		.query("queue.jobs.retention.failed", (db) =>
			db
				.deleteFrom("lucid_queue_jobs")
				.where("status", "in", ["failed", "cancelled"])
				.where((eb) =>
					eb.or([
						eb("failed_at", "<", failedBefore),
						eb("cancelled_at", "<", failedBefore),
					]),
				),
		)
		.first();
	if (failed.error) return failed;

	return { error: undefined, data: undefined };
};

export default clearExpiredJobs;
