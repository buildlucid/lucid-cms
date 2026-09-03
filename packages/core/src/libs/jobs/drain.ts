import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import { JobsRepository } from "../repositories/index.js";
import { consumeJob } from "./consume/index.js";

/** Runs job IDs through one shared worker pool. */
const processJobs = async (
	context: ServiceContext,
	jobIds: readonly string[],
	concurrentLimit: number,
) => {
	let nextIndex = 0;
	let processed = 0;

	/** Consumes job IDs until this worker finds no work left. */
	const run = async () => {
		while (true) {
			const jobId = jobIds[nextIndex];
			if (!jobId) return;
			nextIndex += 1;

			const result = await consumeJob(context, { jobId });
			if (result.type !== "ignored") processed += 1;
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(concurrentLimit, jobIds.length) }, () =>
			run(),
		),
	);
	return processed;
};

/** Finds and runs a batch of ready jobs within one concurrency limit. */
export const drainJobs: ServiceFn<
	[
		data: {
			limit: number;
			concurrentLimit: number;
		},
	],
	{ found: number; processed: number }
> = async (context, data) => {
	const now = new Date().toISOString();

	const Jobs = new JobsRepository(context.db);
	const candidates = await Jobs.selectReadyJobIds({ limit: data.limit, now });
	if (candidates.error) return candidates;

	const processed = await processJobs(
		context,
		candidates.data.map((candidate) => candidate.job_id),
		data.concurrentLimit,
	);

	return {
		error: undefined,
		data: {
			found: candidates.data.length,
			processed,
		},
	};
};
