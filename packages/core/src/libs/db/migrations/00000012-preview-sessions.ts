import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000012: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_preview_sessions")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("token_hash", adapter.getDataType("char", 64), (col) =>
					col.unique().notNull(),
				)
				.addColumn("entry_collection_key", adapter.getDataType("text"), (col) =>
					col.notNull().references("lucid_collections.key").onDelete("cascade"),
				)
				.addColumn("entry_document_id", adapter.getDataType("integer"), (col) =>
					col.notNull(),
				)
				.addColumn(
					"entry_version_type",
					adapter.getDataType("varchar", 255),
					(col) => col.notNull(),
				)
				.addColumn("entry_version_id", adapter.getDataType("integer"))
				.addColumn("expires_at", adapter.getDataType("timestamp"), (col) =>
					col.notNull(),
				)
				.addColumn("created_by", adapter.getDataType("integer"), (col) =>
					col.references("lucid_users.id").onDelete("set null"),
				)
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col
						.defaultTo(
							adapter.formatDefaultValue(
								"timestamp",
								adapter.getDefault("timestamp", "now"),
							),
						)
						.notNull(),
				)
				.execute();

			await db.schema
				.createIndex("idx_preview_sessions_entry_document")
				.on("lucid_preview_sessions")
				.columns(["entry_collection_key", "entry_document_id"])
				.execute();

			await db.schema
				.createIndex("idx_preview_sessions_expires_at")
				.on("lucid_preview_sessions")
				.column("expires_at")
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};

export default Migration00000012;
