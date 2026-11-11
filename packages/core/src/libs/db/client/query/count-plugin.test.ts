import { SQLiteAdapter } from "@lucidcms/sqlite";
import { sql } from "kysely";
import { afterAll, beforeAll, expect, test } from "vitest";
import createLucidDatabase from "../../create-lucid-database.js";
import type { DatabaseConnection } from "../../types.js";
import type LucidDatabase from "../lucid-database.js";
import QueryCountPlugin from "./count-plugin.js";

let connection: DatabaseConnection;
let database: LucidDatabase;

beforeAll(async () => {
	const adapter = new SQLiteAdapter({ database: ":memory:" });
	connection = await adapter.connect();
	database = createLucidDatabase({ client: connection.client, adapter });
	await sql`create table counted (id integer primary key)`.execute(
		connection.client,
	);
});

afterAll(async () => {
	await connection.destroy();
});

test("counts the queries run through its client, including inside transactions", async () => {
	const queries = new QueryCountPlugin();
	const counted = database.withPlugin(queries);

	await sql`insert into counted (id) values (1)`.execute(counted.kysely);
	await counted.kysely.transaction().execute(async (transaction) => {
		await sql`insert into counted (id) values (2)`.execute(transaction);
		await sql`select id from counted`.execute(transaction);
	});
	await sql`select id from counted`.execute(database.kysely);

	expect(queries.count).toBe(3);
	expect(queries.durationMs).toBeGreaterThan(0);
});

test("leaves out queries that fail", async () => {
	const queries = new QueryCountPlugin();
	const counted = database.withPlugin(queries);

	await expect(
		sql`select missing from counted`.execute(counted.kysely),
	).rejects.toThrow();

	expect(queries.count).toBe(0);
});
