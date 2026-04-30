import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000010: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_alerts")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("type", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("level", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("dedupe_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("title", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("message", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("metadata", adapter.getDataType("json"), (col) =>
					col.notNull(),
				)
				.addColumn("email_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_emails.id").onDelete("set null"),
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
				.createIndex("idx_lucid_alerts_type_dedupe_key")
				.on("lucid_alerts")
				.columns(["type", "dedupe_key"])
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};
export default Migration00000010;
