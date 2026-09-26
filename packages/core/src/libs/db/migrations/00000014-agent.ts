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
			.createTable("lucid_agent_conversations")
			.addColumn("id", adapter.getDataType("text"), (col) => col.primaryKey())
			.addColumn("agent_key", adapter.getDataType("text"), (col) =>
				col.notNull(),
			)
			.addColumn("title", adapter.getDataType("text"), (col) => col.notNull())
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
			.column("run_id")
			.execute();

		await db.schema
			.alterTable("lucid_ai_generations")
			.addColumn("agent_conversation_id", adapter.getDataType("text"), (col) =>
				col.references("lucid_agent_conversations.id").onDelete("set null"),
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
