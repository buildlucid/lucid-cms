import z from "zod/v4";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class QueueJobsRepository extends StaticRepository<"lucid_queue_jobs"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_queue_jobs");
	}
	tableSchema = z.object({
		id: z.union([z.string(), z.number()]),
		job_id: z.string(),
		event_type: z.string(),
		event_data: z.record(z.string(), z.unknown()).nullable(),
		status: z.enum(["pending", "processing", "completed", "failed"]),
		queue_adapter_key: z.string(),
		priority: z.number().nullable(),
		attempts: z.number(),
		max_attempts: z.number(),
		error_message: z.string().nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		scheduled_for: z.union([z.string(), z.date()]).nullable(),
		started_at: z.union([z.string(), z.date()]).nullable(),
		completed_at: z.union([z.string(), z.date()]).nullable(),
		failed_at: z.union([z.string(), z.date()]).nullable(),
		next_retry_at: z.union([z.string(), z.date()]).nullable(),
		created_by_user_id: z.union([z.string(), z.number()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		job_id: this.dbAdapter.getDataType("text"),
		event_type: this.dbAdapter.getDataType("text"),
		event_data: this.dbAdapter.getDataType("json"),
		status: this.dbAdapter.getDataType("text"),
		queue_adapter_key: this.dbAdapter.getDataType("text"),
		priority: this.dbAdapter.getDataType("integer"),
		attempts: this.dbAdapter.getDataType("integer"),
		max_attempts: this.dbAdapter.getDataType("integer"),
		error_message: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		scheduled_for: this.dbAdapter.getDataType("timestamp"),
		started_at: this.dbAdapter.getDataType("timestamp"),
		completed_at: this.dbAdapter.getDataType("timestamp"),
		failed_at: this.dbAdapter.getDataType("timestamp"),
		next_retry_at: this.dbAdapter.getDataType("timestamp"),
		created_by_user_id: this.dbAdapter.getDataType("integer"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				jobId: "job_id",
				eventType: "event_type",
				status: "status",
				queueAdapterKey: "queue_adapter_key",
				priority: "priority",
				attempts: "attempts",
				maxAttempts: "max_attempts",
				createdByUserId: "created_by_user_id",
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
		},
		operators: {
			event_type: this.dbAdapter.config.fuzzOperator,
			queue_adapter_key: this.dbAdapter.config.fuzzOperator,
			error_message: this.dbAdapter.config.fuzzOperator,
		},
	} as const;

	// ----------------------------------------
	// queries
	async selectJobsForProcessing<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				data: {
					limit: number;
					currentTime: Date;
				};
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_queue_jobs")
			.selectAll()
			.where((eb) =>
				eb.or([
					eb("status", "=", "pending"),
					eb.and([
						eb("status", "=", "failed"),
						eb("attempts", "<", eb.ref("max_attempts")),
						eb("next_retry_at", "<=", props.data.currentTime.toISOString()),
					]),
				]),
			)
			.orderBy(["priority desc", "created_at asc"])
			.limit(props.data.limit);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectJobsForProcessing",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			selectAll: true,
		});
	}
}
