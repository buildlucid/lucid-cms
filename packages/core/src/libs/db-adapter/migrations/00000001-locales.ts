import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000001: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_locales")
				.addColumn("code", adapter.getDataType("text"), (col) =>
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
				.addColumn("is_deleted_at", adapter.getDataType("timestamp"), (col) =>
					col.defaultTo(null),
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
		},
		async down(db: Kysely<unknown>) {},
	};
};

export default Migration00000001;
