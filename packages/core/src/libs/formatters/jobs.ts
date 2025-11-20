import type { JobResponse } from "../../types/response.js";
import type { QueueEvent, QueueJobStatus } from "../queue-adapter/types.js";
import formatter from "./index.js";

interface JobPropT {
	id: number;
	job_id: string;
	event_type: QueueEvent;
	event_data: Record<string, unknown>;
	queue_adapter_key: string;
	status: QueueJobStatus;
	priority: number | null;
	attempts: number;
	max_attempts: number;
	error_message: string | null;
	created_at: Date | string | null;
	scheduled_for: Date | string | null;
	started_at: Date | string | null;
	completed_at: Date | string | null;
	failed_at: Date | string | null;
	next_retry_at: Date | string | null;
	created_by_user_id: number | null;
	updated_at: Date | string | null;
}

const formatMultiple = (props: { jobs: JobPropT[] }) => {
	return props.jobs.map((j) =>
		formatSingle({
			job: j,
		}),
	);
};

const formatSingle = (props: { job: JobPropT }): JobResponse => {
	return {
		id: props.job.id,
		jobId: props.job.job_id,
		eventType: props.job.event_type,
		eventData: props.job.event_data,
		queueAdapterKey: props.job.queue_adapter_key,
		status: props.job.status,
		priority: props.job.priority,
		attempts: props.job.attempts,
		maxAttempts: props.job.max_attempts,
		errorMessage: props.job.error_message,
		createdAt: formatter.formatDate(props.job.created_at),
		scheduledFor: formatter.formatDate(props.job.scheduled_for),
		startedAt: formatter.formatDate(props.job.started_at),
		completedAt: formatter.formatDate(props.job.completed_at),
		failedAt: formatter.formatDate(props.job.failed_at),
		nextRetryAt: formatter.formatDate(props.job.next_retry_at),
		createdByUserId: props.job.created_by_user_id,
		updatedAt: formatter.formatDate(props.job.updated_at),
	};
};

export default {
	formatMultiple,
	formatSingle,
};
