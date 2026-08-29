import type { Job } from "../../types/response.js";
import type { LucidQueueJobs } from "../db/tables/queue-jobs.js";
import type { Select } from "../db/types.js";
import formatter from "./helpers.js";

type JobPropT = Pick<
	Select<LucidQueueJobs>,
	| "id"
	| "job_id"
	| "job_name"
	| "job_version"
	| "display_data"
	| "queue_adapter_key"
	| "status"
	| "attempts"
	| "max_attempts"
	| "dispatch_status"
	| "dispatch_attempts"
	| "dispatch_error"
	| "error_message"
	| "created_at"
	| "available_at"
	| "started_at"
	| "completed_at"
	| "failed_at"
	| "cancelled_at"
	| "dispatched_at"
	| "lease_expires_at"
	| "created_by_user_id"
	| "updated_at"
>;

const formatMultiple = (props: { jobs: JobPropT[] }) => {
	return props.jobs.map((j) =>
		formatSingle({
			job: j,
		}),
	);
};

const formatSingle = (props: { job: JobPropT }): Job => {
	return {
		id: props.job.id,
		jobId: props.job.job_id,
		jobName: props.job.job_name,
		jobVersion: props.job.job_version,
		displayData: props.job.display_data,
		queueAdapterKey: props.job.queue_adapter_key,
		status: props.job.status,
		attempts: props.job.attempts,
		maxAttempts: props.job.max_attempts,
		dispatchStatus: props.job.dispatch_status,
		dispatchAttempts: props.job.dispatch_attempts,
		dispatchError: props.job.dispatch_error,
		errorMessage: props.job.error_message,
		createdAt: formatter.formatDate(props.job.created_at),
		availableAt: formatter.formatDate(props.job.available_at),
		startedAt: formatter.formatDate(props.job.started_at),
		completedAt: formatter.formatDate(props.job.completed_at),
		failedAt: formatter.formatDate(props.job.failed_at),
		cancelledAt: formatter.formatDate(props.job.cancelled_at),
		dispatchedAt: formatter.formatDate(props.job.dispatched_at),
		leaseExpiresAt: formatter.formatDate(props.job.lease_expires_at),
		createdByUserId: props.job.created_by_user_id,
		updatedAt: formatter.formatDate(props.job.updated_at),
	};
};

export default {
	formatMultiple,
	formatSingle,
};
