import constants from "../../constants/constants.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { copy } from "../i18n/index.js";
import logger from "../logger/index.js";
import { JobsRepository } from "../repositories/index.js";

const DISPATCH_BATCH_SIZE = 100;
const DISPATCH_RETRY_BASE_MS = 1_000;
const DISPATCH_RETRY_MAX_MS = 60_000;

/** Publishes queued jobs whose durable dispatch record is ready. */
export const dispatchPendingJobs: ServiceFn<
	[
		data?: {
			jobIds?: readonly string[];
			limit?: number;
			createdBefore?: string;
		},
	],
	{ count: number }
> = async (context, data = {}) => {
	if (data.jobIds?.length === 0) {
		return { error: undefined, data: { count: 0 } };
	}

	const Jobs = new JobsRepository(context.db);
	const pending = await Jobs.selectPendingDispatch({
		createdBefore: data.createdBefore,
		jobIds: data.jobIds,
		limit: data.limit ?? DISPATCH_BATCH_SIZE,
		now: new Date().toISOString(),
	});
	if (pending.error) return pending;
	if (pending.data.length === 0) {
		return { error: undefined, data: { count: 0 } };
	}

	const jobIds = pending.data.map((job) => job.job_id);
	const published = await context.queue.publish(
		context,
		pending.data.map((job) => ({
			version: 1,
			jobId: job.job_id,
			availableAt: new Date(job.available_at).toISOString(),
		})),
	);

	if (published.error) {
		const attempt = Math.max(
			0,
			...pending.data.map((job) => job.dispatch_attempts),
		);
		const nextDispatchAt = new Date(
			Date.now() +
				Math.min(DISPATCH_RETRY_BASE_MS * 2 ** attempt, DISPATCH_RETRY_MAX_MS),
		).toISOString();

		const message = context.translate.english(
			published.error.message ?? copy("server:core.jobs.dispatch.failed"),
		);

		const recorded = await Jobs.recordDispatchFailure({
			jobIds,
			message: message.slice(0, 1_000),
			nextDispatchAt,
			now: new Date().toISOString(),
		});

		logger.error({
			error: published.error,
			event: "jobs.dispatch.failed",
			message: "Job dispatch failed",
			scope: constants.logScopes.jobs,
			data: { count: jobIds.length, nextDispatchAt },
		});
		if (recorded.error) return recorded;

		return { error: undefined, data: { count: 0 } };
	}

	const marked = await Jobs.markDispatched({
		jobIds,
		now: new Date().toISOString(),
	});
	if (marked.error) return marked;

	return { error: undefined, data: { count: jobIds.length } };
};

/** Publishes every pending job that existed when the flush began. */
export const flushPendingJobs: ServiceFn<[], { count: number }> = async (
	context,
) => {
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
