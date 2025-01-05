import { describe, afterAll, test, expect } from "vitest";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import ClientIntegrationsRepository from "./client-integrations";

describe("Tests for the client integrations repository", async () => {
	const db = new SQLiteAdapter({
		database: async () => new Database(":memory:"),
	});

	afterAll(() => {
		db.client.destroy();
	});

	await db.migrateToLatest();
	const ClientIntegrations = new ClientIntegrationsRepository(db.client, db);
	const tables = await db.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === ClientIntegrations.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			expect(ClientIntegrations.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
