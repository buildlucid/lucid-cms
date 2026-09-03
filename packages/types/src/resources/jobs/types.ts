/** The current lifecycle state of a durable job. */
export type JobStatus =
	| "queued"
	| "running"
	| "completed"
	| "failed"
	| "cancelled";

/** Whether a queued job has been sent to its configured adapter. */
export type JobDispatchStatus = "pending" | "dispatched";

/** Identifies how a durable job was created. */
export type JobTriggerType = "enqueue" | "schedule";

/** A durable job returned by the Lucid API. */
export interface Job {
	id: number;
	jobId: string;
	jobName: string;
	jobVersion: number;
	triggerType: JobTriggerType;
	scheduleKey: string | null;
	scheduledFor: string | null;
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

/** The latest job created for one registered schedule. */
export type JobScheduleRun = Pick<
	Job,
	| "scheduledFor"
	| "jobId"
	| "status"
	| "attempts"
	| "maxAttempts"
	| "errorMessage"
> & {
	durationMs: number | null;
};

/** A schedule registered on the latest version of a job definition. */
export interface JobScheduleSummary {
	key: string;
	name: string;
	jobName: string;
	jobVersion: number;
	cron: string;
	timezone: string;
	overlap: "skip" | "allow";
	missed: "skip" | "run-once";
	state: "active" | "paused";
	pausedAt: string | null;
	pausedByUserId: number | null;
	nextRunAt: string;
	lastRun: JobScheduleRun | null;
}
