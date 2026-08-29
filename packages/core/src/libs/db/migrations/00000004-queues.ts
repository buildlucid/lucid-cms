import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000004: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_queue_jobs")
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
				.addColumn("payload", adapter.getDataType("json"), (col) =>
					col.notNull(),
				)
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
				.createIndex("idx_queue_jobs_job_id")
				.unique()
				.on("lucid_queue_jobs")
				.column("job_id")
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_claim")
				.on("lucid_queue_jobs")
				.columns(["status", "available_at"])
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_expired_lease")
				.on("lucid_queue_jobs")
				.columns(["status", "lease_expires_at"])
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_dispatch")
				.on("lucid_queue_jobs")
				.columns(["dispatch_status", "next_dispatch_at"])
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_created")
				.on("lucid_queue_jobs")
				.column("created_at")
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_completed_retention")
				.on("lucid_queue_jobs")
				.columns(["status", "completed_at"])
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_failed_retention")
				.on("lucid_queue_jobs")
				.columns(["status", "failed_at"])
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_cancelled_retention")
				.on("lucid_queue_jobs")
				.columns(["status", "cancelled_at"])
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};

export default Migration00000004;
