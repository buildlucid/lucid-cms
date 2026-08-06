import type { Seed } from "./types.js";

/**
 * A typed helper for authoring repeatable project or plugin data seeds. Seeds
 * receive Lucid's service context, allowing direct database access or use of
 * the separately imported toolkit as its capabilities grow.
 *
 * @example
 * export default defineSeed(async (context) => {
 * 	const result = await context.db.query("seed.example.insert", (db) =>
 * 		db
 * 			.$extendTables<{ my_table: { name: string } }>()
 * 			.insertInto("my_table")
 * 			.values({ name: "Example" }),
 * 	).many();
 * 	if (result.error) throw result.error;
 * });
 */
const defineSeed = (seed: Seed): Seed => seed;

export default defineSeed;
