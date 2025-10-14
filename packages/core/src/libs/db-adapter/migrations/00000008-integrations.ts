import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000008: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_client_integrations")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("name", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("description", adapter.getDataType("text"))
				.addColumn("enabled", adapter.getDataType("boolean"), (col) =>
					col.notNull(),
				)
				.addColumn("key", adapter.getDataType("text"), (col) =>
					col.notNull().unique(),
				)
				.addColumn("api_key", adapter.getDataType("text"), (col) =>
					col.notNull(),
				)
				.addColumn("secret", adapter.getDataType("text"), (col) =>
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
