import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import type DatabaseAdapter from "../adapter.js";

const Migration00000005: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_emails")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("email_hash", adapter.getDataType("char", 64), (col) =>
					col.unique().notNull(),
				)
				.addColumn("from_address", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("from_name", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("to_address", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("subject", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("cc", adapter.getDataType("text"))
				.addColumn("bcc", adapter.getDataType("text"))
				.addColumn("delivery_status", adapter.getDataType("text"), (col) =>
					col.notNull(),
				) // 'pending', 'delivered', 'failed'
				.addColumn("template", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("data", adapter.getDataType("jsonb"))
				.addColumn("type", adapter.getDataType("text"), (col) => col.notNull()) // 'internal' or 'external'
				.addColumn("sent_count", adapter.getDataType("integer"), (col) =>
					col.notNull().defaultTo(0),
				)
				.addColumn("error_count", adapter.getDataType("integer"), (col) =>
					col.notNull().defaultTo(0),
				)
				.addColumn("last_error_message", adapter.getDataType("text"))
				.addColumn("last_attempt_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.addColumn("last_success_at", adapter.getDataType("timestamp"))
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};
export default Migration00000005;
