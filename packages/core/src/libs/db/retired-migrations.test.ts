import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { sql } from "kysely";
import { afterAll, beforeAll, expect, test } from "vitest";
import type { DatabaseConnection } from "./types.js";

const retired = "1788900000000-removed-plugin";
let adapter: SQLiteAdapter;
let connection: DatabaseConnection;

beforeAll(async () => {
	adapter = new SQLiteAdapter({ database: ":memory:" });
	connection = await adapter.connect();
	await adapter.migrateCoreToLatest(connection);
	//* as if a plugin ran this migration and was then removed
	await sql`
		INSERT INTO kysely_migration (name, timestamp)
		VALUES (${retired}, ${new Date().toISOString()})
	`.execute(connection.client);
});
afterAll(async () => {
	await connection.destroy();
});

test("removed plugin migrations are retired instead of breaking the history", async () => {
	const status = await adapter.getMigrationStatus(connection.client);
	expect(status.missing).toEqual([]);
	expect(status.retired).toEqual([retired]);

	const migrator = await adapter.createMigrator(connection);
	expect((await migrator.migrateToLatest()).error).toBeUndefined();
});

test("adding a removed plugin back doesn't run its migrations again", async () => {
	adapter.registerExternalMigrations({
		[retired]: {
			up: async () => {
				throw new Error("ran twice");
			},
		},
	});
	const status = await adapter.getMigrationStatus(connection.client);
	expect(status.retired).toEqual([]);
	expect(status.pendingExternal).toEqual([]);
});

test("unregistered Lucid migrations still stop migrations", async () => {
	await sql`
		INSERT INTO kysely_migration (name, timestamp)
		VALUES (${"00000099-removed"}, ${new Date().toISOString()})
	`.execute(connection.client);
	await expect(adapter.migrateCoreToLatest(connection)).rejects.toThrow(
		"00000099-removed",
	);
});
