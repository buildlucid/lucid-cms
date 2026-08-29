import z from "zod";
import type { ServiceContext } from "../../../utils/services/types.js";
import { consumeJob } from "./consume-job.js";

const candidateSchema = z.object({
	job_id: z.string(),
});

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
export const drainJobs = async (
	context: ServiceContext,
	data: {
		limit: number;
		concurrentLimit: number;
	},
) => {
	const now = new Date().toISOString();

	const candidates = await context.db
		.query("queue.jobs.ready.find", (db) =>
			db
				.selectFrom("lucid_queue_jobs")
				.select("job_id")
				.where("cancel_requested_at", "is", null)
				.whereRef("attempts", "<", "max_attempts")
				.where((eb) =>
					eb.or([
						eb.and([
							eb("status", "=", "queued"),
							eb("available_at", "<=", now),
						]),
						eb.and([
							eb("status", "=", "running"),
							eb("lease_expires_at", "<=", now),
						]),
					]),
				)
				.orderBy("available_at", "asc")
				.orderBy("created_at", "asc")
				.orderBy("id", "asc")
				.limit(data.limit),
		)
		.many({ schema: candidateSchema });
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
