import type { ExternalMigration } from "./types.js";

/**
 * A typed helper for authoring external migration files. Migration files
 * registered via `config.migrations.sources` or the project `migrations/`
 * directory must default export the result of this helper.
 *
 * External migrations run after Lucid's core and generated collection
 * migrations, once collection state has been synchronized. `lucid_*` tables
 * are internal and modifying them is unsupported. External tables may point
 * foreign keys at Lucid-owned tables; Lucid-owned schema must not depend on an
 * external table.
 *
 * @example
 * export default defineMigration({
 * 	async up(context) {
 * 		await context.db.kysely.schema
 * 			.createTable("my_table")
 * 			.addColumn("id", context.config.db.getDataType("primary"), (col) =>
 * 				context.config.db.primaryKeyColumnBuilder(col),
 * 			)
 * 			.execute();
 * 	},
 * 	async down(context) {
 * 		await context.db.kysely.schema.dropTable("my_table").execute();
 * 	},
 * });
 */
const defineMigration = (migration: ExternalMigration): ExternalMigration =>
	migration;

export default defineMigration;
