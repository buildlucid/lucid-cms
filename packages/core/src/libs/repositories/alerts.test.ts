import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import { afterAll, describe, expect, test } from "vitest";
import AlertsRepository from "./alerts";

describe("Tests for the alerts repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});

	afterAll(() => {
		db.client.destroy();
	});

	await db.migrateToLatest();
	const Alerts = new AlertsRepository(db.client, db);
	const tables = await db.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === Alerts.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(Alerts.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
