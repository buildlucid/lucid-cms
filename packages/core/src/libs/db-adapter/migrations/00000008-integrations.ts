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
				.addColumn("last_used_at", adapter.getDataType("timestamp"))
				.addColumn("last_used_ip", adapter.getDataType("varchar", 255))
				.addColumn("last_used_user_agent", adapter.getDataType("text"))
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

			await db.schema
				.createTable("lucid_client_integration_scopes")
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn(
					"client_integration_id",
					adapter.getDataType("integer"),
					(col) =>
						col
							.references("lucid_client_integrations.id")
							.onDelete("cascade")
							.notNull(),
				)
				.addColumn("scope", adapter.getDataType("text"), (col) => col.notNull())
				.addColumn("core", adapter.getDataType("boolean"), (col) =>
					col
						.notNull()
						.defaultTo(
							adapter.formatDefaultValue(
								"boolean",
								adapter.getDefault("boolean", "true"),
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
				.createIndex(
					"idx_lucid_client_integration_scopes_client_integration_id",
				)
				.on("lucid_client_integration_scopes")
				.column("client_integration_id")
				.execute();

			await db.schema
				.createIndex("idx_lucid_client_integration_scopes_scope")
				.on("lucid_client_integration_scopes")
				.column("scope")
				.execute();
		},
		async down(_db: Kysely<unknown>) {},
	};
};

export default Migration00000008;
