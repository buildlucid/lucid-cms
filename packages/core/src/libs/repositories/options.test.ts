import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import OptionsRepository from "./options";

describe("Tests for the options repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	await db.migrateToLatest(connection);
	const Options = new OptionsRepository(connection.client, db);
	const tables = await connection.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === Options.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(Options.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});

	test("keeps the first immutable text option value", async () => {
		const first = await Options.ensureTextValue({
			name: "instance_id",
			value: "c0a80121-9f7b-4f2e-8c3d-37af87ae36ea",
		});
		expect(first.error).toBeUndefined();
		expect(first.data?.value_text).toBe("c0a80121-9f7b-4f2e-8c3d-37af87ae36ea");

		const second = await Options.ensureTextValue({
			name: "instance_id",
			value: "1aa954b7-eb61-42cf-b7ca-835921186674",
		});
		expect(second.error).toBeUndefined();
		expect(second.data?.value_text).toBe(first.data?.value_text);
	});
});
