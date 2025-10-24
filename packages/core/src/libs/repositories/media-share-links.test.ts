import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import { afterAll, describe, expect, test } from "vitest";
import MediaShareLinksRepository from "./media-share-links";

describe("Tests for the media share links repository", async () => {
	const db = new SQLiteAdapter({
		database: async () => new Database(":memory:"),
	});

	afterAll(() => {
		db.client.destroy();
	});

	await db.migrateToLatest();
	const MediaShareLinks = new MediaShareLinksRepository(db.client, db);
	const tables = await db.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === MediaShareLinks.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			expect(MediaShareLinks.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
