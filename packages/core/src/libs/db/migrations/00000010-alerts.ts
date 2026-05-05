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
				.createTable("lucid_alert_recipients")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("alert_id", adapter.getDataType("integer"), (col) =>
					col.notNull().references("lucid_alerts.id").onDelete("cascade"),
				)
				.addColumn("user_id", adapter.getDataType("integer"), (col) =>
					col.notNull().references("lucid_users.id").onDelete("cascade"),
				)
				.addColumn("read_at", adapter.getDataType("timestamp"))
				.addColumn("dismissed_at", adapter.getDataType("timestamp"))
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

			await db.schema
				.createIndex("idx_lucid_alert_recipients_user")
				.on("lucid_alert_recipients")
				.columns(["user_id", "read_at", "dismissed_at"])
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};
export default Migration00000010;
