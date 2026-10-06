import { type Kysely, sql } from "kysely";
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

			// Shared features reference this identity instead of a collection-specific table.
			await db.schema
				.createTable("lucid_document_identities")
				.addColumn("collection_key", adapter.getDataType("text"), (col) =>
					col.notNull().references("lucid_collections.key").onDelete("cascade"),
				)
				.addColumn("document_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addPrimaryKeyConstraint("pk_document_identities", [
					"collection_key",
					"document_id",
				])
				.execute();

			await db.schema
				.createTable("lucid_document_version_identities")
				.addColumn("collection_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("document_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("version_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addPrimaryKeyConstraint("pk_document_version_identities", [
					"collection_key",
					"version_id",
				])
				.addUniqueConstraint("uniq_document_version_identity_owner", [
					"collection_key",
					"document_id",
					"version_id",
				])
				.addForeignKeyConstraint(
					"fk_document_version_identity_document",
					["collection_key", "document_id"],
					"lucid_document_identities",
					["collection_key", "document_id"],
					(constraint) => constraint.onDelete("cascade"),
				)
				.execute();

			// Reverse lookups retain embedded identities when their target is deleted.
			await db.schema
				.createTable("lucid_document_references")
				.addColumn("generation", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("collection_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("document_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("version_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("source_table", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("source_column", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("locale", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("kind", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("target_resource", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("target_table", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("target_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addForeignKeyConstraint(
					"fk_document_reference_owner",
					["collection_key", "document_id", "version_id"],
					"lucid_document_version_identities",
					["collection_key", "document_id", "version_id"],
					(constraint) => constraint.onDelete("cascade"),
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_document_references_owner")
				.on("lucid_document_references")
				.columns([
					"collection_key",
					"version_id",
					"source_table",
					"source_column",
					"locale",
					"kind",
					"target_resource",
					"target_table",
					"target_id",
				])
				.unique()
				.execute();

			await db.schema
				.createIndex("idx_lucid_document_references_target")
				.on("lucid_document_references")
				.columns(["target_resource", "target_table", "target_id"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_document_references_document")
				.on("lucid_document_references")
				.columns(["collection_key", "document_id"])
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
				.createTable("lucid_releases")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("type", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("title", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("description", adapter.getDataType("json"))
				.addColumn("status", adapter.getDataType("text"), (col) =>
					col.notNull().defaultTo("open"),
				)
				.addColumn("revision", adapter.getDataType("integer"), (col) =>
					col.notNull().defaultTo(1),
				)
				.addColumn("approved_revision", adapter.getDataType("integer"))
				.addColumn("approved_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("approved_at", adapter.getDataType("timestamp"))
				.addColumn("scheduled_at", adapter.getDataType("timestamp"))
				.addColumn("scheduled_timezone", adapter.getDataType("text"))
				.addColumn("scheduled_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("execution_job_id", adapter.getDataType("text"))
				.addColumn("failure", adapter.getDataType("text"))
				.addColumn(
					"failure_release_document_id",
					adapter.getDataType("integer"),
				)
				.addColumn("failure_target", adapter.getDataType("text"))
				.addColumn("released_at", adapter.getDataType("timestamp"))
				.addColumn("lock_token", adapter.getDataType("text"))
				.addColumn("created_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
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
				.addColumn("updated_at", adapter.getDataType("timestamp"))
				.execute();

			await db.schema
				.createTable("lucid_release_documents")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("release_id", adapter.getDataType("integer"), (col) =>
					col.notNull().references("lucid_releases.id").onDelete("cascade"),
				)
				.addColumn("collection_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("document_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn("source", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("source_version_id", adapter.getDataType("integer"))
				.addColumn("approved_workflow_stage", adapter.getDataType("text"))
				.addColumn("approved_version_id", adapter.getDataType("integer"))
				.addForeignKeyConstraint(
					"fk_lucid_release_documents_source",
					["collection_key", "document_id", "source_version_id"],
					"lucid_document_version_identities",
					["collection_key", "document_id", "version_id"],
					(constraint) => constraint.onDelete("restrict"),
				)
				.addForeignKeyConstraint(
					"fk_lucid_release_documents_approved",
					["collection_key", "document_id", "approved_version_id"],
					"lucid_document_version_identities",
					["collection_key", "document_id", "version_id"],
					(constraint) => constraint.onDelete("restrict"),
				)
				.addUniqueConstraint("uniq_lucid_release_documents_document", [
					"release_id",
					"collection_key",
					"document_id",
				])
				.execute();

			await db.schema
				.createTable("lucid_release_targets")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn(
					"release_document_id",
					adapter.getDataType("integer"),
					(col) =>
						col
							.notNull()
							.references("lucid_release_documents.id")
							.onDelete("cascade"),
				)
				.addColumn("target", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("reviewed_version_id", adapter.getDataType("integer"))
				.addColumn("reviewed_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("reviewed_at", adapter.getDataType("timestamp"))
				.addColumn("approved_version_id", adapter.getDataType("integer"))
				.addUniqueConstraint("uniq_lucid_release_targets_release", [
					"release_document_id",
					"target",
				])
				.execute();

			await db.schema
				.createTable("lucid_release_reviewers")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("release_id", adapter.getDataType("integer"), (col) =>
					col.notNull().references("lucid_releases.id").onDelete("cascade"),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.notNull().references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("assigned_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("assigned_at", adapter.getDataType("timestamp"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						),
				)
				.addUniqueConstraint("uniq_lucid_release_reviewers_user", [
					"release_id",
					"user_id",
				])
				.execute();

			await db.schema
				.createTable("lucid_release_events")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("release_id", adapter.getDataType("integer"), (col) =>
					col.notNull().references("lucid_releases.id").onDelete("cascade"),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("parent_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_release_events.id").onDelete("cascade"),
				)
				.addColumn("type", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("body", adapter.getDataType("json"))
				.addColumn("metadata", adapter.getDataType("json"))
				.addColumn("resolution", adapter.getDataType("text"))
				.addColumn("resolved_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("resolved_at", adapter.getDataType("timestamp"))
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
				.addColumn("updated_at", adapter.getDataType("timestamp"))
				.execute();

			await db.schema
				.createIndex("idx_lucid_releases_status")
				.on("lucid_releases")
				.columns(["status", "created_at"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_releases_schedule")
				.on("lucid_releases")
				.columns(["status", "execution_job_id", "scheduled_at"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_release_documents_document")
				.on("lucid_release_documents")
				.columns(["collection_key", "document_id"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_release_reviewers_user")
				.on("lucid_release_reviewers")
				.columns(["user_id", "release_id"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_release_events_release")
				.on("lucid_release_events")
				.columns(["release_id", "created_at"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_release_events_parent")
				.on("lucid_release_events")
				.column("parent_id")
				.execute();

			await db.schema
				.createTable("lucid_document_workflows")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("collection_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("document_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				//* null for latest, so its workflow stays put as new versions are saved
				.addColumn("version_id", adapter.getDataType("integer"))
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
				.addForeignKeyConstraint(
					"fk_document_workflows_document",
					["collection_key", "document_id"],
					"lucid_document_identities",
					["collection_key", "document_id"],
					(constraint) => constraint.onDelete("cascade"),
				)
				.addForeignKeyConstraint(
					"fk_document_workflows_version",
					["collection_key", "document_id", "version_id"],
					"lucid_document_version_identities",
					["collection_key", "document_id", "version_id"],
					(constraint) => constraint.onDelete("cascade"),
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
				.createIndex("idx_lucid_document_workflows_version")
				.on("lucid_document_workflows")
				.columns(["collection_key", "version_id"])
				.unique()
				.execute();

			await db.schema
				.createIndex("idx_lucid_document_workflows_latest")
				.on("lucid_document_workflows")
				.columns(["collection_key", "document_id"])
				.unique()
				.where(sql<boolean>`version_id is null`)
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
