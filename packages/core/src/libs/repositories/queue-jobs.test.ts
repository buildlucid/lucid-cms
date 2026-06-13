import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import { afterAll, describe, expect, test } from "vitest";
import QueueJobsRepository from "./queue-jobs";

describe("Tests for the queue jobs repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});

	afterAll(() => {
		db.client.destroy();
	});

	await db.migrateToLatest();
	const QueueJobs = new QueueJobsRepository(db.client, db);
	const tables = await db.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === QueueJobs.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(QueueJobs.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
