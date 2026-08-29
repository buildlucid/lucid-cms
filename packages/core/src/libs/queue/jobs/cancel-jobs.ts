import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { JobCancelResult } from "../types.js";
import { cancelJob } from "./cancel-job.js";

/** Cancels multiple jobs and returns each outcome in the same order. */
export const cancelJobs = async (
	context: ServiceContext,
	data: { ids: readonly string[] },
): ServiceResponse<JobCancelResult[]> => {
	const results: JobCancelResult[] = [];
	for (const id of data.ids) {
		const result = await cancelJob(context, { id });
		if (result.error) return result;
		results.push(result.data);
	}
	return { error: undefined, data: results };
};
