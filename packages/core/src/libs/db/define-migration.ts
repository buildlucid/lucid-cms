import type { ExternalMigrationFn } from "./types.js";

/**
 * A typed helper for authoring external migration files. Migration files
 * registered via `config.migrations.sources` or the project `migrations/`
 * directory must default export the result of this helper.
 *
 * External migrations run after core migrations. `lucid_*` tables are internal
 * and modifying them is unsupported.
 *
 * @example
 * export default defineMigration(({ adapter }) => ({
 * 	async up(db) {
 * 		await db.schema
 * 			.createTable("my_table")
 * 			.addColumn("id", adapter.getDataType("primary"), (col) =>
 * 				adapter.primaryKeyColumnBuilder(col),
 * 			)
 * 			.execute();
 * 	},
 * 	async down(db) {
 * 		await db.schema.dropTable("my_table").execute();
 * 	},
 * }));
 */
const defineMigration = (fn: ExternalMigrationFn): ExternalMigrationFn => fn;

export default defineMigration;
