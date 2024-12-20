import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import {
	defaultTimestamp,
	typeLookup,
	primaryKeyColumn,
} from "../kysely/column-helpers.js";

const Migration00000008: MigrationFn = (adapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_client_integrations")
				.addColumn("id", typeLookup("serial", adapter), (col) =>
					primaryKeyColumn(col, adapter),
				)
				.addColumn("name", "text", (col) => col.notNull())
				.addColumn("description", "text")
				.addColumn("enabled", "integer", (col) => col.notNull())
				.addColumn("key", "text", (col) => col.notNull().unique())
				.addColumn("api_key", "text", (col) => col.notNull())
				.addColumn("secret", "text", (col) => col.notNull())
				.addColumn("created_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
				)
				.addColumn("updated_at", "timestamp", (col) =>
					defaultTimestamp(col, adapter),
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
