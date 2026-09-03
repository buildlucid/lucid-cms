import type { Job, JobScheduleSummary } from "../../types/response.js";
import type { LucidJobs } from "../db/tables/jobs.js";
import type { Select } from "../db/types.js";
import type {
	JobScheduleOverride,
	RegisteredJobSchedule,
} from "../jobs/scheduler/registered-schedules.js";
import formatter from "./helpers.js";

type JobPropT = Pick<
	Select<LucidJobs>,
	| "id"
	| "job_id"
	| "job_name"
	| "job_version"
	| "trigger_type"
	| "schedule_key"
	| "scheduled_for"
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

type JobScheduleRunProp = Pick<
	Select<LucidJobs>,
	| "scheduled_for"
	| "job_id"
	| "status"
	| "attempts"
	| "max_attempts"
	| "started_at"
	| "completed_at"
	| "failed_at"
	| "cancelled_at"
	| "error_message"
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
		triggerType: props.job.trigger_type,
		scheduleKey: props.job.schedule_key,
		scheduledFor: formatter.formatDate(props.job.scheduled_for),
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

const formatSchedule = (props: {
	binding: RegisteredJobSchedule;
	nextRunAt: Date;
	lastRun?: JobScheduleRunProp;
	override?: JobScheduleOverride;
}): JobScheduleSummary => {
	const startedAt = formatter.formatDate(props.lastRun?.started_at);
	const endedAt = formatter.formatDate(
		props.lastRun?.completed_at ??
			props.lastRun?.failed_at ??
			props.lastRun?.cancelled_at,
	);

	return {
		key: props.binding.key,
		name: props.binding.schedule.name,
		jobName: props.binding.job.name,
		jobVersion: props.binding.job.version,
		cron: props.binding.schedule.cron,
		timezone: props.binding.schedule.timezone,
		overlap: props.binding.schedule.overlap,
		missed: props.binding.schedule.missed,
		state: props.override ? "paused" : "active",
		pausedAt: formatter.formatDate(props.override?.pausedAt),
		pausedByUserId: props.override?.pausedByUserId ?? null,
		nextRunAt: props.nextRunAt.toISOString(),
		lastRun: props.lastRun
			? {
					scheduledFor: formatter.formatDate(props.lastRun.scheduled_for),
					jobId: props.lastRun.job_id,
					status: props.lastRun.status,
					attempts: props.lastRun.attempts,
					maxAttempts: props.lastRun.max_attempts,
					durationMs:
						startedAt && endedAt
							? Math.max(
									0,
									new Date(endedAt).getTime() - new Date(startedAt).getTime(),
								)
							: null,
					errorMessage: props.lastRun.error_message,
				}
			: null,
	};
};

export default {
	formatMultiple,
	formatSchedule,
	formatSingle,
};
