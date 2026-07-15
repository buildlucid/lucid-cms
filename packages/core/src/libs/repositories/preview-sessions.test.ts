import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import PreviewSessionsRepository from "./preview-sessions";

describe("Tests for the preview sessions repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});

	afterAll(() => {
		db.client.destroy();
	});

	await db.migrateToLatest();
	const PreviewSessions = new PreviewSessionsRepository(db.client, db);
	const tables = await db.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === PreviewSessions.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(PreviewSessions.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
