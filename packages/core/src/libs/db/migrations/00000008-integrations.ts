import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import type DatabaseAdapter from "../adapter.js";

const Migration00000008: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_client_integrations")
				.addColumn("id", adapter.getColumnType("serial"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("name", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("description", adapter.getColumnType("text"))
				.addColumn("enabled", adapter.getColumnType("boolean"), (col) =>
					col.notNull(),
				)
				.addColumn("key", adapter.getColumnType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("api_key", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("secret", adapter.getColumnType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("created_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.addColumn("updated_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(
						adapter.formatDefaultValue(
							"timestamp",
							adapter.config.defaults.timestamp.now,
						),
					),
				)
				.execute();

			await db.schema
				.createIndex("idx_lucid_client_integrations_key")
				.on("lucid_client_integrations")
				.column("key")
				.execute();

			await db.schema
				.createIndex("idx_lucid_client_integrations_api_key")
				.on("lucid_client_integrations")
				.column("api_key")
				.execute();

			await db.schema
				.createIndex("idx_lucid_client_integrations_secret")
				.on("lucid_client_integrations")
				.column("secret")
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};

export default Migration00000008;
