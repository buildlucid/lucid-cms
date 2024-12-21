import { sql, type Kysely } from "kysely";
import { AdapterType, type MigrationFn } from "../types.js";
import type DatabaseAdapter from "../adapter.js";

const Migration00000001: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			if (adapter.adapter === AdapterType.POSTGRES) {
				await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`.execute(db);
			}
			await db.schema
				.createTable("lucid_locales")
				.addColumn("code", adapter.getColumnType("text"), (col) =>
					col.primaryKey(),
				)
				.addColumn("is_deleted", adapter.getColumnType("integer"), (col) =>
					col.defaultTo(0),
				)
				.addColumn("is_deleted_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(null),
				)
				.addColumn("created_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(sql.raw(adapter.config.defaults.timestamp)),
				)
				.addColumn("updated_at", adapter.getColumnType("timestamp"), (col) =>
					col.defaultTo(sql.raw(adapter.config.defaults.timestamp)),
				)
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};

export default Migration00000001;
