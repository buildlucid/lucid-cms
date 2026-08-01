import type { Seed } from "./types.js";

/**
 * A typed helper for authoring repeatable project or plugin data seeds. Seeds
 * receive Lucid's service context, allowing direct database access or use of
 * the separately imported toolkit as its capabilities grow.
 *
 * @example
 * export default defineSeed(async (context) => {
 * 	const db = context.db.client.withTables<{ my_table: { name: string } }>();
 * 	await db.insertInto("my_table").values({ name: "Example" }).execute();
 * });
 */
const defineSeed = (seed: Seed): Seed => seed;

export default defineSeed;
