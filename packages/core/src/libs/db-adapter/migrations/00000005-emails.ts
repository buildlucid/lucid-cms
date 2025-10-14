import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000005: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_emails")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
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
				.addColumn("template", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("data", adapter.getDataType("json"))
				.addColumn("type", adapter.getDataType("text"), (col) => col.notNull()) // 'internal' or 'external'
				.addColumn("current_status", adapter.getDataType("text"), (col) =>
					col.notNull(),
				) // 'pending', 'delivered', 'failed'
				.addColumn("attempt_count", adapter.getDataType("integer"), (col) =>
					col.notNull().defaultTo(0),
				)
				.addColumn("last_attempted_at", adapter.getDataType("timestamp"))
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
				.createTable("lucid_email_transactions")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("email_id", adapter.getDataType("integer"), (col) =>
					col.references("lucid_emails.id").onDelete("cascade").notNull(),
				)
				.addColumn("delivery_status", adapter.getDataType("text"), (col) =>
					col.notNull(),
				) // 'pending', 'delivered', 'failed'
				.addColumn("message", adapter.getDataType("text"))
				.addColumn("external_message_id", adapter.getDataType("text"))
				.addColumn("strategy_identifier", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("strategy_data", adapter.getDataType("json"))
				.addColumn("simulate", adapter.getDataType("boolean"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.getDefault("boolean", "false"),
							),
						),
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
				.createIndex("idx_lucid_email_transactions_external_message_id")
				.on("lucid_email_transactions")
				.column("external_message_id")
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};
export default Migration00000005;
