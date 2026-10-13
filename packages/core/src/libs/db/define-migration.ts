import type { ExternalMigration } from "./types.js";

/**
 * Defines an external migration that its migration file must default-export.
 * @remarks External migrations run after core migrations, generated collection migrations and collection sync.
 * Modifying internal `lucid_*` tables is unsupported; external tables may reference Lucid tables, but Lucid schema must not depend on external tables.
 *
 * @example
 * export default defineMigration({
 * 	async up({ context }) {
 * 		await context.db.kysely.schema
 * 			.createTable("my_table")
 * 			.addColumn("id", context.config.db.getDataType("primary"), (col) =>
 * 				context.config.db.primaryKeyColumnBuilder(col),
 * 			)
 * 			.execute();
 * 	},
 * 	async down({ context }) {
 * 		await context.db.kysely.schema.dropTable("my_table").execute();
 * 	},
 * });
 */
const defineMigration = (migration: ExternalMigration): ExternalMigration =>
	migration;

export default defineMigration;
