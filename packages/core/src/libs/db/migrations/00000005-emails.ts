import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import {
	defaultTimestamp,
	typeLookup,
	primaryKeyColumn,
} from "../kysely/column-helpers.js";

const Migration00000005: MigrationFn = (adapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_emails")
				.addColumn("id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("email_hash", "char(64)", (col) => col.unique().notNull())
				.addColumn("from_address", "text", (col) => col.notNull())
				.addColumn("from_name", "text", (col) => col.notNull())
				.addColumn("to_address", "text", (col) => col.notNull())
				.addColumn("subject", "text", (col) => col.notNull())
				.addColumn("cc", "text")
				.addColumn("bcc", "text")
				.addColumn("delivery_status", "text", (col) => col.notNull()) // 'pending', 'delivered', 'failed'
				.addColumn("template", "text", (col) => col.notNull())
				.addColumn("data", "text")
				.addColumn("type", "text", (col) => col.notNull()) // 'internal' or 'external'
				.addColumn("sent_count", "integer", (col) => col.notNull().defaultTo(0))
				.addColumn("error_count", "integer", (col) =>
					col.notNull().defaultTo(0),
				)
				.addColumn("last_error_message", "text")
				.addColumn("last_attempt_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.addColumn("last_success_at", "timestamp")
				.addColumn("created_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};

export default Migration00000005;
