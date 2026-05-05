import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import { afterAll, describe, expect, test } from "vitest";
import DocumentPublishOperationAssigneesRepository from "./document-publish-operation-assignees";

describe("Tests for the document publish operation assignees repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});

	afterAll(() => {
		db.client.destroy();
	});

	await db.migrateToLatest();
	const DocumentPublishOperationAssignees =
		new DocumentPublishOperationAssigneesRepository(db.client, db);
	const tables = await db.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find(
			(t) => t.name === DocumentPublishOperationAssignees.tableName,
		);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			expect(
				// @ts-expect-error
				DocumentPublishOperationAssignees.columnFormats[column.name],
			).toEqual(column.dataType.toLowerCase());
		}
	});
});
