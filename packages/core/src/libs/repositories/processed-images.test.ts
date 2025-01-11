import { describe, afterAll, test, expect } from "vitest";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import ProcessedImagesRepository from "./processed-images";

describe("Tests for the processed images repository", async () => {
	const db = new SQLiteAdapter({
		database: async () => new Database(":memory:"),
	});

	afterAll(() => {
		db.client.destroy();
	});

	await db.migrateToLatest();
	const ProcessedImages = new ProcessedImagesRepository(db.client, db);
	const tables = await db.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === ProcessedImages.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			expect(ProcessedImages.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
