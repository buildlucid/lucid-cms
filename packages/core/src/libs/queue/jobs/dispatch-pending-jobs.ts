import { sql } from "kysely";
import z from "zod";
import constants from "../../../constants/constants.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import logger from "../../logger/index.js";

const dispatchJobSchema = z.object({
	job_id: z.string(),
	available_at: z.union([z.string(), z.date()]),
	dispatch_attempts: z.number(),
});

const DISPATCH_BATCH_SIZE = 100;

/** Publishes queued jobs whose durable dispatch record is ready. */
export const dispatchPendingJobs = async (
	context: ServiceContext,
	data: {
		jobIds?: readonly string[];
		limit?: number;
		createdBefore?: string;
	} = {},
): ServiceResponse<{ count: number }> => {
	if (data.jobIds?.length === 0) {
		return { error: undefined, data: { count: 0 } };
	}

	const now = new Date().toISOString();
	const selectResult = await context.db
		.query("queue.jobs.dispatch.find", (db) => {
			let query = db
				.selectFrom("lucid_queue_jobs")
				.select(["job_id", "available_at", "dispatch_attempts"])
				.where("status", "=", "queued")
				.where("dispatch_status", "=", "pending")
				.where((eb) =>
					eb.or([
						eb("next_dispatch_at", "is", null),
						eb("next_dispatch_at", "<=", now),
					]),
				)
				.orderBy("available_at", "asc")
				.orderBy("created_at", "asc")
				.orderBy("id", "asc")
				.limit(data.limit ?? DISPATCH_BATCH_SIZE);

			if (data.jobIds) {
				query = query.where("job_id", "in", [...data.jobIds]);
			}
			if (data.createdBefore) {
				query = query.where("created_at", "<=", data.createdBefore);
			}
			return query;
		})
		.many({ schema: dispatchJobSchema });
	if (selectResult.error) return selectResult;

	if (selectResult.data.length === 0) {
		return { error: undefined, data: { count: 0 } };
	}

	const jobIds = selectResult.data.map((job) => job.job_id);
	try {
		await context.queue.publish(
			context,
			selectResult.data.map((job) => ({
				version: 1,
				jobId: job.job_id,
				availableAt: new Date(job.available_at).toISOString(),
			})),
		);

		const dispatchedAt = new Date().toISOString();
		const updateResult = await context.db
			.query("queue.jobs.dispatch.complete", (db) =>
				db
					.updateTable("lucid_queue_jobs")
					.set({
						dispatch_status: "dispatched",
						dispatched_at: dispatchedAt,
						dispatch_error: null,
						next_dispatch_at: null,
						updated_at: dispatchedAt,
					})
					.where("job_id", "in", jobIds)
					.where("dispatch_status", "=", "pending"),
			)
			.first();
		if (updateResult.error) return updateResult;

		return { error: undefined, data: { count: jobIds.length } };
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: context.translate.english(
						copy("server:core.queue.jobs.dispatch.failed"),
					);
		const highestAttempt = Math.max(
			...selectResult.data.map((job) => job.dispatch_attempts + 1),
		);
		const nextDispatchAt = new Date(
			Date.now() +
				Math.min(2 ** Math.max(0, highestAttempt - 1) * 1_000, 60_000),
		).toISOString();

		const updateResult = await context.db
			.query("queue.jobs.dispatch.fail", (db) =>
				db
					.updateTable("lucid_queue_jobs")
					.set({
						dispatch_attempts: sql<number>`dispatch_attempts + 1`,
						dispatch_error: message.slice(0, 1_000),
						next_dispatch_at: nextDispatchAt,
						updated_at: new Date().toISOString(),
					})
					.where("job_id", "in", jobIds)
					.where("dispatch_status", "=", "pending"),
			)
			.first();

		logger.error({
			error,
			event: "queue.jobs.dispatch.failed",
			message: "Queue job dispatch failed",
			scope: constants.logScopes.queueAdapter,
			data: { count: jobIds.length, nextDispatchAt },
		});
		if (updateResult.error) return updateResult;

		return { error: undefined, data: { count: 0 } };
	}
};
