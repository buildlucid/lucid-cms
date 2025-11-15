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
				.addColumn("event_type", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("event_data", adapter.getDataType("json"), (col) =>
					col.notNull(),
				)
				.addColumn("status", adapter.getDataType("text"), (col) =>
					col.notNull().defaultTo("pending"),
				)
				.addColumn("queue_adapter_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("priority", adapter.getDataType("integer"), (col) =>
					col.defaultTo(0),
				)
				.addColumn("attempts", adapter.getDataType("integer"), (col) =>
					col.defaultTo(0).notNull(),
				)
				.addColumn("max_attempts", adapter.getDataType("integer"), (col) =>
					col.defaultTo(3).notNull(),
				)
				.addColumn("error_message", adapter.getDataType("text"))
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						)
						.notNull(),
				)
				.addColumn("scheduled_for", adapter.getDataType("timestamp"))
				.addColumn("started_at", adapter.getDataType("timestamp"))
				.addColumn("completed_at", adapter.getDataType("timestamp"))
				.addColumn("failed_at", adapter.getDataType("timestamp"))
				.addColumn("next_retry_at", adapter.getDataType("timestamp"))
				.addColumn(
					"created_by_user_id",
					adapter.getDataType("integer"),
					(col) => col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("updated_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_job_id")
				.on("lucid_queue_jobs")
				.column("job_id")
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_status")
				.on("lucid_queue_jobs")
				.column("status")
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_scheduled")
				.on("lucid_queue_jobs")
				.columns(["status", "scheduled_for"])
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_retry")
				.on("lucid_queue_jobs")
				.columns(["status", "next_retry_at"])
				.execute();

			await db.schema
				.createIndex("idx_queue_jobs_created")
				.on("lucid_queue_jobs")
				.column("created_at")
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};

export default Migration00000004;
