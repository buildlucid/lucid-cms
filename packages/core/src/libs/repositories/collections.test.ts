import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import CollectionsRepository from "./collections";

describe("Tests for the collections repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	await db.migrateToLatest(connection);
	const Collections = new CollectionsRepository(connection.client, db);
	const tables = await connection.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === Collections.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(Collections.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
