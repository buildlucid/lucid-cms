import type { ServiceFn } from "../../utils/services/types.js";
import { JobsRepository } from "../repositories/index.js";
import type { JobCancelResult } from "./types.js";

/** Cancels a queued job or asks a running job to stop. */
export const cancelJob: ServiceFn<
	[data: { id: string }],
	JobCancelResult
> = async (context, data) => {
	const now = new Date().toISOString();
	const Jobs = new JobsRepository(context.db);

	const cancelled = await Jobs.cancelQueued({ jobId: data.id, now });
	if (cancelled.error) return cancelled;
	if (cancelled.data) {
		return { error: undefined, data: { type: "cancelled" } };
	}

	const requested = await Jobs.requestCancellation({ jobId: data.id, now });
	if (requested.error) return requested;
	if (requested.data) {
		return { error: undefined, data: { type: "cancellation-requested" } };
	}

	const existing = await Jobs.selectSingle({
		select: ["status"],
		where: [{ key: "job_id", operator: "=", value: data.id }],
	});
	if (existing.error) return existing;
	if (!existing.data) return { error: undefined, data: { type: "not-found" } };

	if (existing.data.status === "queued" || existing.data.status === "running") {
		return {
			error: undefined,
			data: { type: "conflict", status: existing.data.status },
		};
	}

	return {
		error: undefined,
		data: { type: "already-finished", status: existing.data.status },
	};
};

/** Cancels multiple jobs and returns each outcome in the same order. */
export const cancelJobs: ServiceFn<
	[data: { ids: readonly string[] }],
	JobCancelResult[]
> = async (context, data) => {
	const results: JobCancelResult[] = [];

	for (const id of data.ids) {
		const result = await cancelJob(context, { id });
		if (result.error) return result;
		results.push(result.data);
	}

	return { error: undefined, data: results };
};
