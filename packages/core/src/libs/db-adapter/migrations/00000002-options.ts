import type { Kysely } from "kysely";
import type DatabaseAdapter from "../adapter-base.js";
import type { MigrationFn } from "../types.js";

const Migration00000002: MigrationFn = (adapter: DatabaseAdapter) => {
	return {
		async up(db: Kysely<unknown>) {
			await db.schema
				.createTable("lucid_options")
				.addColumn("name", adapter.getDataType("text"), (col) =>
					col.unique().notNull().primaryKey(),
				)
				.addColumn("value_int", adapter.getDataType("integer"))
				.addColumn("value_text", adapter.getDataType("text"))
				.addColumn("value_bool", adapter.getDataType("boolean"))
				.execute();
		},
		async down(db: Kysely<unknown>) {},
	};
};
export default Migration00000002;
