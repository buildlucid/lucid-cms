import { defineMigration } from "@lucidcms/core";
import type { ExternalMigration, ServiceContext } from "@lucidcms/core/types";

/** The table harness seeds count their runs in, so a test can tell which seeds ran and how often. */
export const SEED_RECORDS_TABLE = "harness_seed_records";

export const SEED_RECORDS_MIGRATION = "1790000000010-harness-seed-records";

type RecordsTables = {
	[SEED_RECORDS_TABLE]: { name: string; runs: number };
};

/** Creates the records table, with one row per name. */
export const seedRecordsMigration: ExternalMigration = defineMigration({
	async up({ context }) {
		const adapter = context.config.db;

		await context.db.kysely.schema
			.createTable(SEED_RECORDS_TABLE)
			.addColumn("id", adapter.getDataType("primary"), (col) =>
				adapter.primaryKeyColumnBuilder(col),
			)
			.addColumn("name", adapter.getDataType("text"), (col) =>
				col.notNull().unique(),
			)
			.addColumn("runs", adapter.getDataType("integer"), (col) => col.notNull())
			.execute();
	},
	async down({ context }) {
		await context.db.kysely.schema.dropTable(SEED_RECORDS_TABLE).execute();
	},
});

/** Counts one run of `name`, adding its row the first time. */
export const recordRun = async (
	context: ServiceContext,
	name: string,
): Promise<void> => {
	await context.db.kysely
		.withTables<RecordsTables>()
		.insertInto(SEED_RECORDS_TABLE)
		.values({ name, runs: 1 })
		.onConflict((conflict) =>
			conflict.column("name").doUpdateSet((eb) => ({
				runs: eb(`${SEED_RECORDS_TABLE}.runs`, "+", 1),
			})),
		)
		.execute();
};
