import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000007: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			// Collections
			await db.schema
				.createTable("lucid_collections")
				.addColumn("key", adapter.getDataType("text"), (col) =>
					col.primaryKey(),
				)
				.addColumn("is_deleted", adapter.getDataType("boolean"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"boolean",
							adapter.getDefault("boolean", "false"),
						),
					),
				)
				.addColumn("is_deleted_at", adapter.getDataType("timestamp"))
				.addColumn("created_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.getDefault("timestamp", "now"),
						),
					),
				)
				.execute();

			// Migrations
			await db.schema
				.createTable("lucid_collection_migrations")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("collection_key", adapter.getDataType("text"), (col) =>
					col.references("lucid_collections.key").onDelete("cascade").notNull(),
				)
				.addColumn("migration_plans", adapter.getDataType("json"), (col) =>
					col.notNull(),
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
		},
		async down(_db: Kysely<unknown>) {},
	};
};

export default Migration00000007;
