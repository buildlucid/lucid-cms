import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import DocumentPublishOperationAssigneesRepository from "./document-publish-operation-assignees";

describe("Tests for the document publish operation assignees repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	await db.migrateToLatest(connection);
	const DocumentPublishOperationAssignees =
		new DocumentPublishOperationAssigneesRepository(connection.client, db);
	const tables = await connection.client.introspection.getTables();

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
