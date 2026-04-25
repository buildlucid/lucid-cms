import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import { afterAll, describe, expect, test } from "vitest";
import SecurityAuditLogsRepository from "./security-audit-logs";

describe("Tests for the security audit logs repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});

	afterAll(() => {
		db.client.destroy();
	});

	await db.migrateToLatest();
	const SecurityAuditLogs = new SecurityAuditLogsRepository(db.client, db);
	const tables = await db.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === SecurityAuditLogs.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(SecurityAuditLogs.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
