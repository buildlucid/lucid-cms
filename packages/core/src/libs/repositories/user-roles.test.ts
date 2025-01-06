import { describe, afterAll, test, expect } from "vitest";
import SQLiteAdapter from "@lucidcms/sqlite-adapter";
import Database from "better-sqlite3";
import UserRolesRepository from "./user-roles";

describe("Tests for the user roles repository", async () => {
	const db = new SQLiteAdapter({
		database: async () => new Database(":memory:"),
	});

	afterAll(() => {
		db.client.destroy();
	});

	await db.migrateToLatest();
	const UserRoles = new UserRolesRepository(db.client, db);
	const tables = await db.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === UserRoles.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			expect(UserRoles.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
