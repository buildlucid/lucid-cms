import { SQLiteAdapter } from "@lucidcms/sqlite";
import { sql } from "kysely";
import { afterAll, beforeAll, expect, test } from "vitest";
import type { DatabaseConnection } from "./types.js";

const executed = "1788900000000-executed";
const waiting = "1788900000001-waiting";
let adapter: SQLiteAdapter;
let connection: DatabaseConnection;

beforeAll(async () => {
	adapter = new SQLiteAdapter({ database: ":memory:" });
	connection = await adapter.connect();
	await adapter.migrateCoreToLatest(connection);
	await sql`
		INSERT INTO kysely_migration (name, timestamp)
		VALUES (${executed}, ${new Date().toISOString()})
	`.execute(connection.client);
});
afterAll(async () => {
	await connection.destroy();
});

test("a server that only knows external migrations by name still reports on them", async () => {
	adapter.registerKnownExternalMigrations([executed, waiting]);

	const status = await adapter.getMigrationStatus(connection.client);
	expect(status.pendingExternal).toEqual([waiting]);
	expect(status.retired).toEqual([]);
});
