import { type Kysely, sql } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000014: MigrationFn = (adapter: DatabaseAdapter) => ({
	async up(db: Kysely<unknown>) {
		await db.schema
			.createTable("lucid_agent_routines")
			.addColumn("id", adapter.getDataType("text"), (col) => col.primaryKey())
			.addColumn("agent_key", adapter.getDataType("text"), (col) =>
				col.notNull(),
			)
			.addColumn("key", adapter.getDataType("text"))
			.addColumn("source", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("name", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("instructions", adapter.getDataType("text"), (col) =>
				col.notNull(),
			)
			.addColumn("conversation_mode", adapter.getDataType("text"), (col) =>
				col.notNull().defaultTo("new"),
			)
			.addColumn("model_selection", adapter.getDataType("json"))
			.addColumn("cron", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("timezone", adapter.getDataType("text"), (col) =>
				col.notNull(),
			)
			.addColumn("enabled", adapter.getDataType("boolean"), (col) =>
				col.notNull().defaultTo(adapter.getDefault("boolean", "true")),
			)
			.addColumn("user_id", adapter.getDataType("integer"), (col) =>
				col.references("lucid_users.id").onDelete("cascade"),
			)
			.addColumn("next_run_at", adapter.getDataType("timestamp"))
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
			.createIndex("idx_agent_routines_due")
			.on("lucid_agent_routines")
			.columns(["enabled", "next_run_at"])
			.execute();

		await db.schema
			.createIndex("idx_agent_routines_user")
			.on("lucid_agent_routines")
			.column("user_id")
			.execute();

		await db.schema
			.createIndex("uniq_agent_routines_key")
			.unique()
			.on("lucid_agent_routines")
			.columns(["agent_key", "key"])
			.execute();

		await db.schema
			.createTable("lucid_agent_routine_tools")
			.addColumn("routine_id", adapter.getDataType("text"), (col) =>
				col.notNull().references("lucid_agent_routines.id").onDelete("cascade"),
			)
			.addColumn("tool_name", adapter.getDataType("text"), (col) =>
				col.notNull(),
			)
			.addColumn("requires_approval", adapter.getDataType("boolean"))
			.addPrimaryKeyConstraint("pk_agent_routine_tools", [
				"routine_id",
				"tool_name",
			])
			.execute();

		await db.schema
			.createTable("lucid_agent_conversations")
			.addColumn("kind", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("approval_mode", adapter.getDataType("text"), (col) =>
				col.notNull().defaultTo("tool-defaults"),
			)
			.addColumn("model_selection", adapter.getDataType("json"))
			.addColumn("id", adapter.getDataType("text"), (col) => col.primaryKey())
			.addColumn("agent_key", adapter.getDataType("text"), (col) =>
				col.notNull(),
			)
			.addColumn("title", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("title_status", adapter.getDataType("text"), (col) =>
				col.notNull().defaultTo("provisional"),
			)
			.addColumn(
				"title_generation_requested_at",
				adapter.getDataType("timestamp"),
			)
			.addColumn("user_id", adapter.getDataType("integer"), (col) =>
				col.references("lucid_users.id").onDelete("cascade"),
			)
			.addColumn("routine_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_routines.id").onDelete("set null"),
			)
			.addColumn("active_run_id", adapter.getDataType("text"))
			.addColumn("queue_paused", adapter.getDataType("boolean"), (col) =>
				col.notNull().defaultTo(adapter.getDefault("boolean", "false")),
			)
			.addColumn("context", adapter.getDataType("json"))
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

		//* routines and their chats reference each other, so this column is added once both tables exist
		await db.schema
			.alterTable("lucid_agent_routines")
			.addColumn("conversation_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_conversations.id").onDelete("set null"),
			)
			.execute();

		await db.schema
			.createIndex("idx_agent_conversations_user_updated")
			.on("lucid_agent_conversations")
			.columns(["user_id", "updated_at"])
			.execute();

		await db.schema
			.createIndex("idx_agent_conversations_agent_user")
			.on("lucid_agent_conversations")
			.columns(["agent_key", "user_id"])
			.execute();

		await db.schema
			.createIndex("idx_agent_conversations_routine")
			.on("lucid_agent_conversations")
			.column("routine_id")
			.execute();

		await db.schema
			.createIndex("idx_agent_conversations_active")
			.on("lucid_agent_conversations")
			.column("active_run_id")
			.where("active_run_id", "is not", null)
			.execute();

		await db.schema
			.createTable("lucid_agent_media_references")
			.addColumn("id", adapter.getDataType("text"), (col) => col.primaryKey())
			.addColumn("conversation_id", adapter.getDataType("text"), (col) =>
				col
					.notNull()
					.references("lucid_agent_conversations.id")
					.onDelete("cascade"),
			)
			.addColumn("media_id", adapter.getDataType("integer"), (col) =>
				col.notNull().references("lucid_media.id").onDelete("cascade"),
			)
			.addColumn("source", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("tool_name", adapter.getDataType("text"))
			.addColumn("managed", adapter.getDataType("boolean"), (col) =>
				col.notNull().defaultTo(adapter.getDefault("boolean", "false")),
			)
			.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
				col.notNull(),
			)
			.execute();

		await db.schema
			.createIndex("uniq_agent_media_reference")
			.on("lucid_agent_media_references")
			.columns(["conversation_id", "media_id"])
			.unique()
			.execute();

		await db.schema
			.createIndex("idx_agent_media_reference_target")
			.on("lucid_agent_media_references")
			.column("media_id")
			.execute();

		await db.schema
			.createTable("lucid_agent_request_references")
			.addColumn("id", adapter.getDataType("text"), (col) => col.primaryKey())
			.addColumn("conversation_id", adapter.getDataType("text"), (col) =>
				col
					.notNull()
					.references("lucid_agent_conversations.id")
					.onDelete("cascade"),
			)
			.addColumn("request_id", adapter.getDataType("integer"), (col) =>
				col.notNull().references("lucid_requests.id").onDelete("cascade"),
			)
			.addColumn("source", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("tool_name", adapter.getDataType("text"))
			.addColumn("managed", adapter.getDataType("boolean"), (col) =>
				col.notNull().defaultTo(adapter.getDefault("boolean", "false")),
			)
			.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
				col.notNull(),
			)
			.execute();

		await db.schema
			.createIndex("uniq_agent_request_reference")
			.on("lucid_agent_request_references")
			.columns(["conversation_id", "request_id"])
			.unique()
			.execute();

		await db.schema
			.createIndex("idx_agent_request_reference_target")
			.on("lucid_agent_request_references")
			.column("request_id")
			.execute();

		await db.schema
			.createTable("lucid_agent_document_references")
			.addColumn("id", adapter.getDataType("text"), (col) => col.primaryKey())
			.addColumn("conversation_id", adapter.getDataType("text"), (col) =>
				col
					.notNull()
					.references("lucid_agent_conversations.id")
					.onDelete("cascade"),
			)
			.addColumn("collection_key", adapter.getDataType("text"), (col) =>
				col.notNull(),
			)
			.addColumn("document_id", adapter.getDataType("integer"), (col) =>
				col.notNull(),
			)
			.addColumn("version_id", adapter.getDataType("integer"))
			.addColumn("source", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("tool_name", adapter.getDataType("text"))
			.addColumn("managed", adapter.getDataType("boolean"), (col) =>
				col.notNull().defaultTo(adapter.getDefault("boolean", "false")),
			)
			.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
				col.notNull(),
			)
			.addForeignKeyConstraint(
				"fk_agent_document_references_document",
				["collection_key", "document_id"],
				"lucid_document_identities",
				["collection_key", "document_id"],
				(constraint) => constraint.onDelete("cascade"),
			)
			.addForeignKeyConstraint(
				"fk_agent_document_reference_version",
				["collection_key", "document_id", "version_id"],
				"lucid_document_version_identities",
				["collection_key", "document_id", "version_id"],
				(constraint) => constraint.onDelete("cascade"),
			)
			.execute();

		await db.schema
			.createIndex("uniq_agent_document_reference")
			.on("lucid_agent_document_references")
			.columns(["conversation_id", "collection_key", "document_id"])
			.where(sql<boolean>`version_id is null`)
			.unique()
			.execute();

		await db.schema
			.createIndex("uniq_agent_document_version_reference")
			.on("lucid_agent_document_references")
			.columns([
				"conversation_id",
				"collection_key",
				"document_id",
				"version_id",
			])
			.where(sql<boolean>`version_id is not null`)
			.unique()
			.execute();

		await db.schema
			.createIndex("idx_agent_document_reference_target")
			.on("lucid_agent_document_references")
			.columns(["collection_key", "document_id", "version_id"])
			.execute();

		await db.schema
			.createTable("lucid_agent_inputs")
			.addColumn("sequence", adapter.getDataType("primary"), (col) =>
				adapter.primaryKeyColumnBuilder(col),
			)
			.addColumn("id", adapter.getDataType("text"), (col) =>
				col.notNull().unique(),
			)
			.addColumn("conversation_id", adapter.getDataType("text"), (col) =>
				col
					.notNull()
					.references("lucid_agent_conversations.id")
					.onDelete("cascade"),
			)
			.addColumn("user_id", adapter.getDataType("integer"), (col) =>
				col.notNull().references("lucid_users.id").onDelete("cascade"),
			)
			.addColumn("text", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("references", adapter.getDataType("json"), (col) =>
				col.notNull().defaultTo("[]"),
			)
			.addColumn("target_run_id", adapter.getDataType("text"))
			.addColumn("status", adapter.getDataType("text"), (col) =>
				col.notNull().defaultTo("pending"),
			)
			.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
				col.notNull(),
			)
			.execute();
		await db.schema
			.createIndex("idx_agent_inputs_pending")
			.on("lucid_agent_inputs")
			.columns(["conversation_id", "status", "sequence"])
			.execute();
		await db.schema
			.createIndex("idx_agent_inputs_target")
			.on("lucid_agent_inputs")
			.column("target_run_id")
			.execute();

		await db.schema
			.createTable("lucid_agent_runs")
			.addColumn("id", adapter.getDataType("text"), (col) => col.primaryKey())
			.addColumn("conversation_id", adapter.getDataType("text"), (col) =>
				col
					.notNull()
					.references("lucid_agent_conversations.id")
					.onDelete("cascade"),
			)
			.addColumn("routine_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_routines.id").onDelete("set null"),
			)
			.addColumn("user_id", adapter.getDataType("integer"), (col) =>
				col.references("lucid_users.id").onDelete("cascade"),
			)
			.addColumn("status", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("outcome", adapter.getDataType("text"))
			.addColumn("summary", adapter.getDataType("text"))
			.addColumn("checkpoint", adapter.getDataType("json"))
			.addColumn("error_message", adapter.getDataType("text"))
			.addColumn("recoveries", adapter.getDataType("integer"), (col) =>
				col.notNull().defaultTo(0),
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
			.addColumn("started_at", adapter.getDataType("timestamp"))
			.addColumn("finished_at", adapter.getDataType("timestamp"))
			.addColumn("lease_expires_at", adapter.getDataType("timestamp"))
			.addColumn("execution_token", adapter.getDataType("text"))
			.addColumn("execution_version", adapter.getDataType("integer"), (col) =>
				col.notNull().defaultTo(0),
			)
			.addColumn("input_notified_at", adapter.getDataType("timestamp"))
			.execute();

		await db.schema
			.createIndex("idx_agent_runs_conversation_created")
			.on("lucid_agent_runs")
			.columns(["conversation_id", "created_at"])
			.execute();

		await db.schema
			.createIndex("idx_agent_runs_status_lease")
			.on("lucid_agent_runs")
			.columns(["status", "lease_expires_at"])
			.execute();

		await db.schema
			.createIndex("idx_agent_runs_routine_created")
			.on("lucid_agent_runs")
			.columns(["routine_id", "created_at"])
			.execute();

		await db.schema
			.createIndex("uniq_agent_routine_active_run")
			.unique()
			.on("lucid_agent_runs")
			.column("routine_id")
			.where(
				sql<boolean>`routine_id is not null and status in ('queued', 'running', 'waiting', 'interrupted')`,
			)
			.execute();

		await db.schema
			.createTable("lucid_agent_messages")
			.addColumn("id", adapter.getDataType("text"), (col) => col.primaryKey())
			.addColumn("conversation_id", adapter.getDataType("text"), (col) =>
				col
					.notNull()
					.references("lucid_agent_conversations.id")
					.onDelete("cascade"),
			)
			.addColumn("run_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_runs.id").onDelete("set null"),
			)
			.addColumn("position", adapter.getDataType("integer"), (col) =>
				col.notNull(),
			)
			.addColumn("execution_version", adapter.getDataType("integer"), (col) =>
				col.notNull().defaultTo(0),
			)
			.addColumn("revision", adapter.getDataType("integer"), (col) =>
				col.notNull().defaultTo(0),
			)
			.addColumn("role", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("parts", adapter.getDataType("json"), (col) => col.notNull())
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
			.createIndex("idx_agent_messages_conversation_position")
			.unique()
			.on("lucid_agent_messages")
			.columns(["conversation_id", "position"])
			.execute();

		await db.schema
			.createIndex("idx_agent_messages_run")
			.on("lucid_agent_messages")
			.columns(["run_id", "execution_version", "revision"])
			.execute();

		await db.schema
			.createTable("lucid_agent_url_keys")
			.addColumn("conversation_id", adapter.getDataType("text"), (col) =>
				col
					.notNull()
					.references("lucid_agent_conversations.id")
					.onDelete("cascade"),
			)
			.addColumn("url_key", adapter.getDataType("text"), (col) => col.notNull())
			.addPrimaryKeyConstraint("pk_agent_url_keys", [
				"conversation_id",
				"url_key",
			])
			.execute();

		//* outlives its run and chat, so changes stay attributed to the agent once a chat is deleted
		await db.schema
			.createTable("lucid_agent_attributions")
			.addColumn("run_id", adapter.getDataType("text"), (col) =>
				col.primaryKey(),
			)
			.addColumn("agent_key", adapter.getDataType("text"), (col) =>
				col.notNull(),
			)
			.addColumn("system", adapter.getDataType("boolean"), (col) =>
				col
					.notNull()
					.defaultTo(
						adapter.formatDefaultValue(
							"boolean",
							adapter.getDefault("boolean", "false"),
						),
					),
			)
			.addColumn("conversation_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_conversations.id").onDelete("set null"),
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
			.execute();

		await db.schema
			.alterTable("lucid_ai_generations")
			.addColumn("agent_run_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_runs.id").onDelete("set null"),
			)
			.execute();

		await db.schema
			.createIndex("idx_ai_generations_agent_run")
			.on("lucid_ai_generations")
			.column("agent_run_id")
			.execute();

		await db.schema
			.alterTable("lucid_requests")
			.addColumn("created_by_run_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_attributions.run_id").onDelete("set null"),
			)
			.execute();

		await db.schema
			.alterTable("lucid_requests")
			.addColumn("scheduled_by_run_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_attributions.run_id").onDelete("set null"),
			)
			.execute();

		await db.schema
			.createIndex("idx_requests_created_by_run")
			.on("lucid_requests")
			.column("created_by_run_id")
			.execute();

		await db.schema
			.alterTable("lucid_request_events")
			.addColumn("agent_run_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_attributions.run_id").onDelete("set null"),
			)
			.execute();

		await db.schema
			.alterTable("lucid_request_events")
			.addColumn("resolved_by_run_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_attributions.run_id").onDelete("set null"),
			)
			.execute();

		await db.schema
			.alterTable("lucid_notifications")
			.addColumn("actor_run_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_attributions.run_id").onDelete("set null"),
			)
			.execute();

		await db.schema
			.createIndex("idx_request_events_agent_run")
			.on("lucid_request_events")
			.column("agent_run_id")
			.execute();

		await db.schema
			.createTable("lucid_agent_compactions")
			.addColumn("id", adapter.getDataType("text"), (col) => col.primaryKey())
			.addColumn("conversation_id", adapter.getDataType("text"), (col) =>
				col
					.notNull()
					.references("lucid_agent_conversations.id")
					.onDelete("cascade"),
			)
			.addColumn("run_id", adapter.getDataType("text"), (col) =>
				col.notNull().references("lucid_agent_runs.id").onDelete("cascade"),
			)
			.addColumn("through_position", adapter.getDataType("integer"), (col) =>
				col.notNull(),
			)
			.addColumn("summary", adapter.getDataType("text"), (col) => col.notNull())
			.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
				col.notNull(),
			)
			.execute();

		await db.schema
			.createIndex("idx_agent_compactions_conversation_position")
			.on("lucid_agent_compactions")
			.columns(["conversation_id", "through_position"])
			.execute();
	},
	async down(_db: Kysely<unknown>) {},
});

export default Migration00000014;
