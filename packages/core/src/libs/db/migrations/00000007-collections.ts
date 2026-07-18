import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000007: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			// Collections
			await db.schema
				.createTable("lucid_collections")
				.addColumn("key", adapter.getDataType("text"), (col) =>
					col.primaryKey(),
				)
				.addColumn("is_deleted", adapter.getDataType("boolean"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"boolean",
							adapter.getDefault("boolean", "false"),
						),
					),
				)
				.addColumn("is_deleted_at", adapter.getDataType("timestamp"))
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();

			// Migrations
			await db.schema
				.createTable("lucid_collection_migrations")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("collection_key", adapter.getDataType("text"), (col) =>
					col.references("lucid_collections.key").onDelete("cascade").notNull(),
				)
				.addColumn("table_name_map", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("migration_plans", adapter.getDataType("json"), (col) =>
					col.notNull(),
				)
				.addColumn("collection_schema", adapter.getDataType("json"), (col) =>
					col.notNull(),
				)
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();

			await db.schema
				.createTable("lucid_document_publish_operations")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("collection_key", adapter.getDataType("text"), (col) =>
					col.notNull().references("lucid_collections.key").onDelete("cascade"),
				)
				.addColumn("tenant_key", adapter.getDataType("text"))
				.addColumn("document_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("target", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("operation_type", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("status", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("source_version_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("source_content_id", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn(
					"snapshot_version_id",
					adapter.getDataType("integer"),
					(col) => col.notNull(),
				)
				.addColumn("requested_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("request_comment", adapter.getDataType("json"))
				.addColumn("decided_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("decision_comment", adapter.getDataType("json"))
				.addColumn("decided_at", adapter.getDataType("timestamp"))
				.addColumn("scheduled_at", adapter.getDataType("timestamp"))
				.addColumn("scheduled_timezone", adapter.getDataType("text"))
				.addColumn("execution_status", adapter.getDataType("text"), (col) =>
					col.notNull().defaultTo("awaiting_approval"),
				)
				.addColumn("executed_at", adapter.getDataType("timestamp"))
				.addColumn("failed_at", adapter.getDataType("timestamp"))
				.addColumn("execution_error_message", adapter.getDataType("text"))
				.addColumn("execution_error_data", adapter.getDataType("json"))
				.addColumn("scheduled_job_id", adapter.getDataType("text"))
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
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
				.createTable("lucid_document_publish_operation_assignees")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("operation_id", adapter.getDataType("integer"), (col) =>
					col
						.notNull()
						.references("lucid_document_publish_operations.id")
						.onDelete("cascade"),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.notNull().references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("assigned_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("assigned_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();

			await db.schema
				.createTable("lucid_document_publish_operation_events")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("operation_id", adapter.getDataType("integer"), (col) =>
					col
						.notNull()
						.references("lucid_document_publish_operations.id")
						.onDelete("cascade"),
				)
				.addColumn("event_type", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("comment", adapter.getDataType("text"))
				.addColumn("metadata", adapter.getDataType("json"), (col) =>
					col.notNull(),
				)
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_publish_operations_tenant_key")
				.on("lucid_document_publish_operations")
				.column("tenant_key")
				.execute();

			await db.schema
				.createIndex("idx_lucid_publish_operations_target")
				.on("lucid_document_publish_operations")
				.columns(["collection_key", "document_id", "target", "status"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_publish_operations_execution")
				.on("lucid_document_publish_operations")
				.columns(["status", "execution_status", "scheduled_at"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_publish_operations_schedule_dispatch")
				.on("lucid_document_publish_operations")
				.columns([
					"status",
					"execution_status",
					"scheduled_job_id",
					"scheduled_at",
				])
				.execute();

			await db.schema
				.createIndex("idx_lucid_publish_operations_requested_by")
				.on("lucid_document_publish_operations")
				.columns(["requested_by", "created_at"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_publish_operations_document_created")
				.on("lucid_document_publish_operations")
				.columns(["collection_key", "document_id", "created_at"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_publish_operations_status_created")
				.on("lucid_document_publish_operations")
				.columns(["status", "created_at"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_publish_operation_assignees_user")
				.on("lucid_document_publish_operation_assignees")
				.columns(["user_id", "operation_id"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_publish_operation_assignees_operation_user")
				.on("lucid_document_publish_operation_assignees")
				.columns(["operation_id", "user_id"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_publish_operation_events_operation")
				.on("lucid_document_publish_operation_events")
				.columns(["operation_id", "created_at"])
				.execute();

			await db.schema
				.createTable("lucid_document_workflows")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("collection_key", adapter.getDataType("text"), (col) =>
					col.notNull().references("lucid_collections.key").onDelete("cascade"),
				)
				.addColumn("document_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("stage_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("created_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("updated_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
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
				.createTable("lucid_document_workflow_assignees")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("workflow_id", adapter.getDataType("integer"), (col) =>
					col
						.notNull()
						.references("lucid_document_workflows.id")
						.onDelete("cascade"),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.notNull().references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("assigned_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("assigned_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_document_workflows_document")
				.on("lucid_document_workflows")
				.columns(["collection_key", "document_id"])
				.unique()
				.execute();

			await db.schema
				.createIndex("idx_lucid_document_workflows_stage")
				.on("lucid_document_workflows")
				.columns(["collection_key", "stage_key", "document_id"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_document_workflow_assignees_user")
				.on("lucid_document_workflow_assignees")
				.columns(["user_id", "workflow_id"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_document_workflow_assignees_workflow_assigned")
				.on("lucid_document_workflow_assignees")
				.columns(["workflow_id", "assigned_at"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_document_workflow_assignees_workflow_user")
				.on("lucid_document_workflow_assignees")
				.columns(["workflow_id", "user_id"])
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};

export default Migration00000007;
