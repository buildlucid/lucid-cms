import type { ColumnType, Generated, JSONColumnType } from "kysely";
import z from "zod";
import {
	jobDispatchStatusSchema,
	jobPayloadSchema,
	jobStatusSchema,
} from "../../queue/schema.js";
import type {
	JobDispatchStatus,
	JobPayload,
	JobStatus,
} from "../../queue/types.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

type RequiredTimestamp = ColumnType<string | Date, string, string>;

export const queueJobsTable = defineTable("lucid_queue_jobs", () => ({
	columns: {
		id: { schema: z.number(), type: "primary" },
		job_id: { schema: z.string(), type: "text" },
		job_name: { schema: z.string(), type: "text" },
		job_version: { schema: z.number(), type: "integer" },
		payload: { schema: jobPayloadSchema, type: "json" },
		display_data: { schema: jobPayloadSchema.nullable(), type: "json" },
		status: {
			schema: jobStatusSchema,
			type: "text",
		},
		queue_adapter_key: { schema: z.string(), type: "text" },
		attempts: { schema: z.number(), type: "integer" },
		max_attempts: { schema: z.number(), type: "integer" },
		available_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
		lease_token: { schema: z.string().nullable(), type: "text" },
		lease_expires_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		heartbeat_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		dispatch_status: {
			schema: jobDispatchStatusSchema,
			type: "text",
		},
		dispatch_attempts: { schema: z.number(), type: "integer" },
		next_dispatch_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		dispatched_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		dispatch_error: { schema: z.string().nullable(), type: "text" },
		error_message: { schema: z.string().nullable(), type: "text" },
		created_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
		started_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		completed_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		failed_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		cancelled_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		cancel_requested_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		created_by_user_id: { schema: z.number().nullable(), type: "integer" },
		updated_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
	},
	query: {
		filters: {
			jobId: "job_id",
			jobName: "job_name",
			jobVersion: "job_version",
			status: "status",
			queueAdapterKey: "queue_adapter_key",
			attempts: "attempts",
			maxAttempts: "max_attempts",
			dispatchStatus: "dispatch_status",
			dispatchAttempts: "dispatch_attempts",
			dispatchError: "dispatch_error",
			errorMessage: "error_message",
			createdByUserId: "created_by_user_id",
			createdAt: "created_at",
			availableAt: "available_at",
			startedAt: "started_at",
			completedAt: "completed_at",
			failedAt: "failed_at",
			cancelledAt: "cancelled_at",
			dispatchedAt: "dispatched_at",
			leaseExpiresAt: "lease_expires_at",
		},
		sorts: {
			jobId: "job_id",
			jobName: "job_name",
			jobVersion: "job_version",
			status: "status",
			queueAdapterKey: "queue_adapter_key",
			attempts: "attempts",
			maxAttempts: "max_attempts",
			dispatchStatus: "dispatch_status",
			dispatchAttempts: "dispatch_attempts",
			createdAt: "created_at",
			availableAt: "available_at",
			startedAt: "started_at",
			completedAt: "completed_at",
			failedAt: "failed_at",
			cancelledAt: "cancelled_at",
			dispatchedAt: "dispatched_at",
			leaseExpiresAt: "lease_expires_at",
			updatedAt: "updated_at",
		},
		operators: {
			jobName: "contains",
			queueAdapterKey: "contains",
			dispatchError: "contains",
			errorMessage: "contains",
		},
	} as const,
}));

export interface LucidQueueJobs {
	id: Generated<number>;
	job_id: string;
	job_name: string;
	job_version: number;
	payload: JSONColumnType<JobPayload, JobPayload, JobPayload>;
	display_data: JSONColumnType<
		JobPayload | null,
		JobPayload | null | undefined,
		JobPayload | null
	>;
	status: JobStatus;
	queue_adapter_key: string;
	attempts: number;
	max_attempts: number;
	available_at: RequiredTimestamp;
	lease_token: string | null;
	lease_expires_at: TimestampMutable;
	heartbeat_at: TimestampMutable;
	dispatch_status: JobDispatchStatus;
	dispatch_attempts: number;
	next_dispatch_at: TimestampMutable;
	dispatched_at: TimestampMutable;
	dispatch_error: string | null;
	error_message: string | null;
	created_at: TimestampImmutable;
	started_at: TimestampMutable;
	completed_at: TimestampMutable;
	failed_at: TimestampMutable;
	cancelled_at: TimestampMutable;
	cancel_requested_at: TimestampMutable;
	created_by_user_id: number | null;
	updated_at: RequiredTimestamp;
}
