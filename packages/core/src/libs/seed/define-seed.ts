import type { Seed } from "./types.js";

/**
 * Defines a repeatable data seed. Use the supplied service context for database
 * queries or the supplied toolkit for content helpers. Seeds may run more than
 * once, so check for existing data or use upserts. Throw a LucidError to report failure.
 * Each seed runs in its own transaction, so a failure undoes its writes and deletes the
 * media files it uploaded.
 *
 * @example
 * export default defineSeed({
 * 	run: async ({ context }) => {
 * 		const result = await context.db.query("seed.example.insert", (db) =>
 * 			db
 * 				.$extendTables<{ my_table: { name: string } }>()
 * 				.insertInto("my_table")
 * 				.values({ name: "Example" }),
 * 		).many();
 * 		if (result.error) throw new LucidError(result.error);
 * 	},
 * });
 */
const defineSeed = (seed: Seed): Seed => seed;

export default defineSeed;
