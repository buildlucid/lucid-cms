import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000011: MigrationFn = (adapter: DatabaseAdapter) => {
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
				.addColumn("tenant_key", adapter.getDataType("text"))
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("target_type", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("target", adapter.getDataType("json"), (col) =>
					col.notNull(),
				)
				.addColumn("output", adapter.getDataType("json"))
				.addColumn("usage", adapter.getDataType("json"))
				.addColumn("model", adapter.getDataType("text"))
				.addColumn("cost_currency", adapter.getDataType("text"))
				.addColumn("cost_total_minor", adapter.getDataType("integer"))
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
				.createIndex("idx_lucid_ai_generations_tenant_key")
				.on("lucid_ai_generations")
				.column("tenant_key")
				.execute();

			await db.schema
				.createIndex("idx_lucid_ai_generations_user")
				.on("lucid_ai_generations")
				.columns(["user_id", "created_at"])
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
		},
		async down(_db: Kysely<unknown>) {},
	};
};

export default Migration00000011;
