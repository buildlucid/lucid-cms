import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import type DatabaseAdapter from "../adapter.js";

const Migration00000005: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_emails")
				.addColumn("id", adapter.getColumnType("serial"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("email_hash", adapter.getColumnType("char", 64), (col) =>
					col.unique().notNull(),
				)
				.addColumn("from_address", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("from_name", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("to_address", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("subject", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("cc", adapter.getColumnType("text"))
				.addColumn("bcc", adapter.getColumnType("text"))
				.addColumn("delivery_status", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				) // 'pending', 'delivered', 'failed'
				.addColumn("template", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("data", adapter.getColumnType("text"))
				.addColumn("type", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				) // 'internal' or 'external'
				.addColumn("sent_count", adapter.getColumnType("integer"), (col) =>
					col.notNull().defaultTo(0),
				)
				.addColumn("error_count", adapter.getColumnType("integer"), (col) =>
					col.notNull().defaultTo(0),
				)
				.addColumn("last_error_message", adapter.getColumnType("text"))
				.addColumn(
					"last_attempt_at",
					adapter.getColumnType("timestamp"),
					(col) =>
						col.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.config.defaults.timestamp.now,
							),
						),
				)
				.addColumn("last_success_at", adapter.getColumnType("timestamp"))
				.addColumn("created_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};
export default Migration00000005;
