import { type Kysely, sql } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000012: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_ai_generations")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("request_id", adapter.getDataType("text"), (col) =>
					col.unique().notNull(),
				)
				.addColumn("provider_request_id", adapter.getDataType("text"))
				.addColumn("feature_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("feature_version", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn(
					"lucid_remote_connection_id",
					adapter.getDataType("integer"),
					(col) =>
						col.references("lucid_remote_connections.id").onDelete("set null"),
				)
				.addColumn("session_type", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("session_id", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("output", adapter.getDataType("json"))
				.addColumn("usage", adapter.getDataType("json"))
				.addColumn("model", adapter.getDataType("text"))
				.addColumn("credits", adapter.getDataType("integer"))
				.addColumn("input_tokens", adapter.getDataType("integer"))
				.addColumn("output_tokens", adapter.getDataType("integer"))
				.addColumn("total_tokens", adapter.getDataType("integer"))
				.addColumn("duration_ms", adapter.getDataType("integer"))
				.addColumn("status", adapter.getDataType("text"), (col) =>
					col.notNull().defaultTo("pending"),
				)
				.addColumn("error_message", adapter.getDataType("text"))
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
				.createIndex("idx_lucid_ai_generations_feature")
				.on("lucid_ai_generations")
				.columns(["feature_key", "created_at"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_ai_generations_session")
				.on("lucid_ai_generations")
				.columns(["session_type", "session_id"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_ai_generations_created_at")
				.on("lucid_ai_generations")
				.column("created_at")
				.execute();

			await db.schema
				.createIndex("idx_lucid_ai_generations_user")
				.on("lucid_ai_generations")
				.columns(["user_id", "created_at"])
				.execute();

			await db.schema
				.createIndex("idx_lucid_ai_generations_remote_connection")
				.on("lucid_ai_generations")
				.column("lucid_remote_connection_id")
				.execute();

			await db.schema
				.createIndex("idx_lucid_ai_generations_pending")
				.on("lucid_ai_generations")
				.columns(["lucid_remote_connection_id", "created_at"])
				.where(sql<boolean>`status = 'pending'`)
				.execute();

			await db.schema
				.alterTable("lucid_media")
				.addColumn("ai_generation_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_ai_generations.id").onDelete("set null"),
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_media_ai_generation_id")
				.on("lucid_media")
				.column("ai_generation_id")
				.execute();

			//* glossary terms and style notes every AI translation follows
			await db.schema
				.createTable("lucid_translation_glossary")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("term", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("locale", adapter.getDataType("text"), (col) =>
					col.references("lucid_locales.code").onDelete("cascade"),
				)
				.addColumn("translation", adapter.getDataType("text"))
				.addColumn("updated_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
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
				.createTable("lucid_translation_styles")
				.addColumn("locale", adapter.getDataType("text"), (col) =>
					col.primaryKey().references("lucid_locales.code").onDelete("cascade"),
				)
				.addColumn("instructions", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("updated_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
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
		},
		async down(_db: Kysely<unknown>) {},
	};
};

export default Migration00000012;
