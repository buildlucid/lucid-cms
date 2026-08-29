/** The current lifecycle state of a durable job. */
export type JobStatus =
	| "queued"
	| "running"
	| "completed"
	| "failed"
	| "cancelled";

/** Whether a queued job has been sent to its configured adapter. */
export type JobDispatchStatus = "pending" | "dispatched";

/** A durable job returned by the Lucid API. */
export interface Job {
	id: number;
	jobId: string;
	jobName: string;
	jobVersion: number;
	displayData: Record<string, unknown> | null;
	queueAdapterKey: string;
	status: JobStatus;
	attempts: number;
	maxAttempts: number;
	dispatchStatus: JobDispatchStatus;
	dispatchAttempts: number;
	dispatchError: string | null;
	errorMessage: string | null;
	createdAt: string | null;
	availableAt: string | null;
	startedAt: string | null;
	completedAt: string | null;
	failedAt: string | null;
	cancelledAt: string | null;
	dispatchedAt: string | null;
	leaseExpiresAt: string | null;
	createdByUserId: number | null;
	updatedAt: string | null;
}
