import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { JobCancelResult } from "../types.js";

/** Cancels a queued job or asks a running job to stop. */
export const cancelJob = async (
	context: ServiceContext,
	data: { id: string },
): ServiceResponse<JobCancelResult> => {
	const now = new Date().toISOString();
	const cancelled = await context.db
		.query("queue.jobs.cancel.queued", (db) =>
			db
				.updateTable("lucid_queue_jobs")
				.set({ status: "cancelled", cancelled_at: now, updated_at: now })
				.where("job_id", "=", data.id)
				.where("status", "=", "queued")
				.returning("job_id"),
		)
		.first();
	if (cancelled.error) return cancelled;
	if (cancelled.data) {
		return { error: undefined, data: { type: "cancelled" } };
	}

	const requested = await context.db
		.query("queue.jobs.cancel.running", (db) =>
			db
				.updateTable("lucid_queue_jobs")
				.set({ cancel_requested_at: now, updated_at: now })
				.where("job_id", "=", data.id)
				.where("status", "=", "running")
				.returning("job_id"),
		)
		.first();
	if (requested.error) return requested;
	if (requested.data) {
		return { error: undefined, data: { type: "cancellation-requested" } };
	}

	const existing = await context.db
		.query("queue.jobs.cancel.find", (db) =>
			db
				.selectFrom("lucid_queue_jobs")
				.select("status")
				.where("job_id", "=", data.id),
		)
		.first();
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
		data: {
			type: "already-finished",
			status: existing.data.status,
		},
	};
};
