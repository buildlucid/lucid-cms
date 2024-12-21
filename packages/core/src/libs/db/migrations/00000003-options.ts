import type { Kysely } from "kysely";
import type { MigrationFn } from "../types.js";
import type DatabaseAdapter from "../adapter.js";

const Migration00000003: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_options")
				.addColumn("name", adapter.getColumnType("text"), (col) =>
					col.unique().notNull().primaryKey(),
				)
				.addColumn("value_int", adapter.getColumnType("integer"))
				.addColumn("value_text", adapter.getColumnType("text"))
				.addColumn("value_bool", adapter.getColumnType("boolean"))
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};
export default Migration00000003;
