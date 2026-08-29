import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { dispatchPendingJobs } from "./dispatch-pending-jobs.js";

const DISPATCH_BATCH_SIZE = 100;

/** Publishes every pending job that existed when the flush began. */
export const flushPendingJobs = async (
	context: ServiceContext,
): ServiceResponse<{ count: number }> => {
	const createdBefore = new Date().toISOString();
	let count = 0;

	while (true) {
		const result = await dispatchPendingJobs(context, {
			createdBefore,
			limit: DISPATCH_BATCH_SIZE,
		});
		if (result.error) return result;
		count += result.data.count;
		if (result.data.count < DISPATCH_BATCH_SIZE) {
			return { error: undefined, data: { count } };
		}
	}
};
