import constants from "../../constants/constants.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import logger from "../logger/index.js";
import { JobsRepository } from "../repositories/index.js";
import { consumeJob } from "./consume/index.js";

/**
 * Keeps up to `maxConcurrentJobs` jobs running for a transport that polls the database, such as
 * the worker queue. Each `fill` starts ready jobs in the free slots and returns without waiting
 * for them, so a slow job never holds up the jobs behind it. `onSettled` runs as each job ends,
 * which is the transport's cue to fill the slot again.
 *
 * @example
 * const pool = createJobPool({ maxConcurrentJobs: 5, batchSize: 10, onSettled: poll });
 * const filled = await pool.fill(context);
 */
export const createJobPool = (props: {
	maxConcurrentJobs: number;
	/** The most jobs one `fill` looks for. */
	batchSize: number;
	onSettled?: () => void;
}) => {
	const running = new Set<Promise<void>>();

	/** Consumes one job in its own slot, freeing the slot whatever happens. */
	const start = (context: ServiceContext, jobId: string) => {
		const run = consumeJob(context, { jobId })
			.then(() => undefined)
			.catch((error: unknown) => {
				logger.error({
					error,
					event: "jobs.pool.consume.failed",
					message: "A job could not be consumed",
					scope: constants.logScopes.jobs,
					data: { jobId },
				});
			})
			.finally(() => {
				running.delete(run);
				props.onSettled?.();
			});
		running.add(run);
	};

	return {
		/** How many jobs are running now. */
		get active() {
			return running.size;
		},
		/** Starts ready jobs in the free slots, and says how many it started. */
		fill: async (
			context: ServiceContext,
		): ServiceResponse<{ started: number }> => {
			const free = Math.min(
				props.batchSize,
				props.maxConcurrentJobs - running.size,
			);
			if (free <= 0) return { error: undefined, data: { started: 0 } };

			const Jobs = new JobsRepository(context.db);
			const ready = await Jobs.selectReadyJobIds({
				limit: free,
				now: new Date().toISOString(),
			});
			if (ready.error) return ready;

			for (const job of ready.data) start(context, job.job_id);

			return { error: undefined, data: { started: ready.data.length } };
		},
		/** Waits for every running job to end, such as before shutting down. */
		settle: async () => {
			await Promise.allSettled([...running]);
		},
	};
};

export type JobPool = ReturnType<typeof createJobPool>;
