import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000004: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_jobs")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("job_id", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("job_name", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("job_version", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("trigger_type", adapter.getDataType("text"), (col) =>
					col.notNull().defaultTo("enqueue"),
				)
				.addColumn("schedule_key", adapter.getDataType("text"))
				.addColumn("scheduled_for", adapter.getDataType("timestamp"))
				.addColumn("idempotency_key", adapter.getDataType("text"))
				.addColumn("payload", adapter.getDataType("json"))
				.addColumn("display_data", adapter.getDataType("json"))
				.addColumn("status", adapter.getDataType("text"), (col) =>
					col.notNull().defaultTo("queued"),
				)
				.addColumn("queue_adapter_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("attempts", adapter.getDataType("integer"), (col) =>
					col.notNull().defaultTo(0),
				)
				.addColumn("max_attempts", adapter.getDataType("integer"), (col) =>
					col.notNull().defaultTo(3),
				)
				.addColumn("available_at", adapter.getDataType("timestamp"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						),
				)
				.addColumn("lease_token", adapter.getDataType("text"))
				.addColumn("lease_expires_at", adapter.getDataType("timestamp"))
				.addColumn("heartbeat_at", adapter.getDataType("timestamp"))
				.addColumn("dispatch_status", adapter.getDataType("text"), (col) =>
					col.notNull().defaultTo("pending"),
				)
				.addColumn("dispatch_attempts", adapter.getDataType("integer"), (col) =>
					col.notNull().defaultTo(0),
				)
				.addColumn("next_dispatch_at", adapter.getDataType("timestamp"))
				.addColumn("dispatched_at", adapter.getDataType("timestamp"))
				.addColumn("dispatch_error", adapter.getDataType("text"))
				.addColumn("error_message", adapter.getDataType("text"))
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						),
				)
				.addColumn("started_at", adapter.getDataType("timestamp"))
				.addColumn("completed_at", adapter.getDataType("timestamp"))
				.addColumn("failed_at", adapter.getDataType("timestamp"))
				.addColumn("cancelled_at", adapter.getDataType("timestamp"))
				.addColumn("cancel_requested_at", adapter.getDataType("timestamp"))
				.addColumn(
					"created_by_user_id",
					adapter.getDataType("integer"),
					(col) => col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("updated_at", adapter.getDataType("timestamp"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						),
				)
				.execute();

			await db.schema
				.createIndex("idx_jobs_job_id")
				.unique()
				.on("lucid_jobs")
				.column("job_id")
				.execute();

			await db.schema
				.createIndex("idx_jobs_idempotency")
				.unique()
				.on("lucid_jobs")
				.column("idempotency_key")
				.execute();

			await db.schema
				.createIndex("idx_jobs_schedule")
				.on("lucid_jobs")
				.columns(["schedule_key", "scheduled_for"])
				.execute();

			await db.schema
				.createIndex("idx_jobs_claim")
				.on("lucid_jobs")
				.columns(["status", "available_at"])
				.execute();

			await db.schema
				.createIndex("idx_jobs_expired_lease")
				.on("lucid_jobs")
				.columns(["status", "lease_expires_at"])
				.execute();

			await db.schema
				.createIndex("idx_jobs_dispatch")
				.on("lucid_jobs")
				.columns(["dispatch_status", "next_dispatch_at"])
				.execute();

			await db.schema
				.createIndex("idx_jobs_created")
				.on("lucid_jobs")
				.column("created_at")
				.execute();

			await db.schema
				.createIndex("idx_jobs_completed_retention")
				.on("lucid_jobs")
				.columns(["status", "completed_at"])
				.execute();

			await db.schema
				.createIndex("idx_jobs_failed_retention")
				.on("lucid_jobs")
				.columns(["status", "failed_at"])
				.execute();

			await db.schema
				.createIndex("idx_jobs_cancelled_retention")
				.on("lucid_jobs")
				.columns(["status", "cancelled_at"])
				.execute();

			await db.schema
				.createTable("lucid_job_scheduler")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("scheduler_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("cursor_at", adapter.getDataType("timestamp"))
				.addColumn("updated_at", adapter.getDataType("timestamp"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						),
				)
				.execute();

			await db.schema
				.createIndex("idx_job_scheduler_key")
				.unique()
				.on("lucid_job_scheduler")
				.column("scheduler_key")
				.execute();

			await db.schema
				.createTable("lucid_job_schedule_overrides")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("schedule_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("paused_at", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.addColumn("paused_by_user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.execute();

			await db.schema
				.createIndex("idx_job_schedule_override_key")
				.unique()
				.on("lucid_job_schedule_overrides")
				.column("schedule_key")
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};

export default Migration00000004;
