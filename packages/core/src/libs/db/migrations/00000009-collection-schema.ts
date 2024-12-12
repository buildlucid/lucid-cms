import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import {
	defaultTimestamp,
	primaryKeyColumnType,
	primaryKeyColumn,
} from "../kysely/column-helpers.js";

const Migration00000009: MigrationFn = (adapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_collection_schema")
				.addColumn("id", primaryKeyColumnType(adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("collection_key", "text", (col) => col.notNull())
				.addColumn("schema", "text", (col) => col.notNull())
				.addColumn("checksum", "text", (col) => col.notNull())
				.addUniqueConstraint("uniq_collection_schema_version", [
					"collection_key",
					"checksum",
				])
				.addColumn("created_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_collection_schema_latest")
				.on("lucid_collection_schema")
				.columns(["collection_key", "created_at"])
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};

export default Migration00000009;
