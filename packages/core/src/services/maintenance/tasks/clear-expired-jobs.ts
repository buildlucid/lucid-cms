import { subDays } from "date-fns";
import { JobsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Removes terminal job history after its configured observability window. */
const clearExpiredJobs: ServiceFn<[], undefined> = async (context) => {
	const completedBefore = subDays(
		new Date(),
		context.config.retention.completedJobs,
	).toISOString();
	const failedBefore = subDays(
		new Date(),
		context.config.retention.failedJobs,
	).toISOString();

	const Jobs = new JobsRepository(context.db);
	const completed = await Jobs.deleteCompletedBefore(completedBefore);
	if (completed.error) return completed;

	const failed = await Jobs.deleteFailedBefore(failedBefore);
	if (failed.error) return failed;

	return { error: undefined, data: undefined };
};

export default clearExpiredJobs;
