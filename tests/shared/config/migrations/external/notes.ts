import { defineMigration } from "@lucidcms/core";
import type { ExternalMigration } from "@lucidcms/core/types";

/** The table a migration created, and where it came from. */
export const EXTERNAL_TABLES = {
	inline: "harness_inline_notes",
	plugin: "harness_plugin_notes",
	file: "harness_file_notes",
	failing: "harness_failing_notes",
} as const;

/**
 * A migration that creates a table with a foreign key to a Lucid table. `references` names a
 * table that only exists once the migrations before external ones have run.
 */
export const createNotesMigration = (options: {
	table: string;
	references: string;
	/** Throws after creating the table, as a migration with a bug would. */
	fails?: boolean;
}): ExternalMigration =>
	defineMigration({
		async up({ context }) {
			const adapter = context.config.db;

			await context.db.kysely.schema
				.createTable(options.table)
				.addColumn("id", adapter.getDataType("primary"), (col) =>
					adapter.primaryKeyColumnBuilder(col),
				)
				.addColumn("document_id", adapter.getDataType("integer"), (col) =>
					col.references(`${options.references}.id`).onDelete("cascade"),
				)
				.addColumn("note", adapter.getDataType("text"))
				.execute();

			if (options.fails) {
				throw new Error("This migration fails on purpose.");
			}
		},
		async down({ context }) {
			await context.db.kysely.schema.dropTable(options.table).execute();
		},
	});
