import { sql, type Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import type DatabaseAdapter from "../adapter.js";

const Migration00000009: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_collection_schema")
				.addColumn("id", adapter.getColumnType("serial"), (col) =>
					adapter.createPrimaryKeyColumn(col),
				)
				.addColumn("collection_key", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("schema", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("checksum", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addUniqueConstraint("uniq_collection_schema_version", [
					"collection_key",
					"checksum",
				])
				.addColumn("created_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(sql.raw(adapter.config.defaults.timestamp)),
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
