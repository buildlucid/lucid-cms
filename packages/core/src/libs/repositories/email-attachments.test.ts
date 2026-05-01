import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import { afterAll, describe, expect, test } from "vitest";
import EmailAttachmentsRepository from "./email-attachments";

describe("Tests for the email-attachments repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});

	afterAll(() => {
		db.client.destroy();
	});

	await db.migrateToLatest();
	const EmailAttachments = new EmailAttachmentsRepository(db.client, db);
	const tables = await db.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === EmailAttachments.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(EmailAttachments.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
