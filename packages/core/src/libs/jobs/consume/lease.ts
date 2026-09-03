import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../utils/services/types.js";
import { JobsRepository } from "../../repositories/index.js";
import type { JobConsumptionResult } from "../types.js";

const LEASE_DURATION_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 20_000;

/** A job row this consumer owns for the duration of its lease. */
export type ClaimedJob = NonNullable<
	Awaited<ReturnType<JobsRepository["claimReady"]>>["data"]
>;

/** Atomically claims a ready job and gives this consumer a lease. */
export const claimJob = async (
	context: ServiceContext,
	props: { jobId: string; now: Date },
) => {
	const Jobs = new JobsRepository(context.db);

	return Jobs.claimReady({
		jobId: props.jobId,
		leaseExpiresAt: new Date(
			props.now.getTime() + LEASE_DURATION_MS,
		).toISOString(),
		leaseToken: randomUUID(),
		now: props.now.toISOString(),
	});
};

/** Decides whether an unclaimed delivery should be ignored or retried later. */
export const resolveUnclaimedDelivery = async (
	context: ServiceContext,
	jobId: string,
): Promise<JobConsumptionResult> => {
	const Jobs = new JobsRepository(context.db);

	const existing = await Jobs.selectDeliveryState(jobId);
	if (existing.error) return { type: "retry-transport" };

	if (
		!existing.data ||
		["completed", "failed", "cancelled"].includes(existing.data.status)
	) {
		return { type: "ignored" };
	}

	//* A queued job waits for its available time, a running one for its lease
	const retryAt =
		existing.data.status === "queued"
			? existing.data.available_at
			: existing.data.lease_expires_at;

	return {
		type: "retry-transport",
		delayMs: retryAt
			? Math.max(1_000, new Date(retryAt).getTime() - Date.now())
			: 1_000,
	};
};

/**
 * Renews a job lease until the returned stop function is called, aborting the
 * handler when ownership of the lease is lost.
 */
export const startLeaseHeartbeat = (
	context: ServiceContext,
	job: ClaimedJob,
	abortController: AbortController,
) => {
	let stopped = false;
	let timeout: ReturnType<typeof setTimeout> | undefined;

	const heartbeat = async () => {
		if (stopped) return;

		const now = new Date();
		const Jobs = new JobsRepository(context.db);

		const result = await Jobs.renewLease({
			jobId: job.job_id,
			leaseExpiresAt: new Date(now.getTime() + LEASE_DURATION_MS).toISOString(),
			leaseToken: job.lease_token,
			now: now.toISOString(),
		});
		if (result.error || !result.data) {
			abortController.abort();
			return;
		}

		timeout = setTimeout(heartbeat, HEARTBEAT_INTERVAL_MS);
	};

	timeout = setTimeout(heartbeat, HEARTBEAT_INTERVAL_MS);

	return () => {
		stopped = true;
		if (timeout) clearTimeout(timeout);
	};
};
