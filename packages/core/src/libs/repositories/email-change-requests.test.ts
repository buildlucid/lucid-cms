import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import EmailChangeRequestsRepository from "./email-change-requests";

describe("Tests for the email change requests repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	await db.migrateToLatest(connection);
	const EmailChangeRequests = new EmailChangeRequestsRepository(
		connection.client,
		db,
	);
	const tables = await connection.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === EmailChangeRequests.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(EmailChangeRequests.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
