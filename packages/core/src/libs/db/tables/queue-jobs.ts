import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import type { QueueEvent, QueueJobStatus } from "../../queue/types.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const queueJobsTable = defineTable("lucid_queue_jobs", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		job_id: {
			schema: z.string(),
			type: "text",
		},
		event_type: {
			schema: z.string(),
			type: "text",
		},
		event_data: {
			schema: z.record(z.string(), z.unknown()),
			type: "json",
		},
		status: {
			schema: z.enum([
				"pending",
				"processing",
				"completed",
				"failed",
				"cancelled",
			]),
			type: "text",
		},
		queue_adapter_key: {
			schema: z.string(),
			type: "text",
		},
		priority: {
			schema: z.number().nullable(),
			type: "integer",
		},
		attempts: {
			schema: z.number(),
			type: "integer",
		},
		max_attempts: {
			schema: z.number(),
			type: "integer",
		},
		error_message: {
			schema: z.string().nullable(),
			type: "text",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		scheduled_for: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
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
		next_retry_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		created_by_user_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		updated_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
	},
	query: {
		filters: {
			jobId: "job_id",
			eventType: "event_type",
			status: "status",
			queueAdapterKey: "queue_adapter_key",
			priority: "priority",
			attempts: "attempts",
			maxAttempts: "max_attempts",
			errorMessage: "error_message",
			createdByUserId: "created_by_user_id",
			createdAt: "created_at",
			scheduledFor: "scheduled_for",
			startedAt: "started_at",
			completedAt: "completed_at",
			failedAt: "failed_at",
			nextRetryAt: "next_retry_at",
		},
		sorts: {
			jobId: "job_id",
			eventType: "event_type",
			status: "status",
			queueAdapterKey: "queue_adapter_key",
			priority: "priority",
			attempts: "attempts",
			maxAttempts: "max_attempts",
			createdAt: "created_at",
			scheduledFor: "scheduled_for",
			startedAt: "started_at",
			completedAt: "completed_at",
			failedAt: "failed_at",
			nextRetryAt: "next_retry_at",
			updatedAt: "updated_at",
		},
		operators: {
			eventType: "contains",
			queueAdapterKey: "contains",
			errorMessage: "contains",
		},
	} as const,
}));

export interface LucidQueueJobs {
	id: Generated<number>;
	job_id: string;
	event_type: QueueEvent;
	event_data: JSONColumnType<
		Record<string, unknown>,
		Record<string, unknown>,
		Record<string, unknown>
	>;
	queue_adapter_key: string;
	status: QueueJobStatus;
	priority: number | null;
	attempts: number;
	max_attempts: number;
	error_message: string | null;
	created_at: TimestampImmutable;
	scheduled_for: TimestampMutable;
	started_at: TimestampMutable;
	completed_at: TimestampMutable;
	failed_at: TimestampMutable;
	next_retry_at: TimestampMutable;
	created_by_user_id: number | null;
	updated_at: TimestampMutable;
}
