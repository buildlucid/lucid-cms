import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import createLucidDatabase from "../create-lucid-database.js";
import type { DatabaseConnection } from "../types.js";

describe("core table definitions", () => {
	let adapter: SQLiteAdapter;
	let connection: DatabaseConnection;

	beforeAll(async () => {
		adapter = new SQLiteAdapter({ database: ":memory:" });
		connection = await adapter.connect();
		await adapter.migrateCoreToLatest(connection);
	});

	afterAll(async () => {
		await connection.destroy();
	});

	test("match every physical table created by the latest core migrations", async () => {
		const database = createLucidDatabase({
			client: connection.client,
			adapter,
		});
		const introspected = await connection.client.introspection.getTables();
		const tablesByName = new Map(
			introspected.map((table) => [table.name, table]),
		);

		for (const definition of database.tables.definitions) {
			// Pattern definitions describe collection tables created at runtime.
			if (definition.matches) continue;
			const table = tablesByName.get(definition.name);
			expect(table, `missing migrated table ${definition.name}`).toBeDefined();
			if (!table) continue;

			const columnsByName = new Map(
				table.columns.map((column) => [column.name, column]),
			);
			for (const [name, column] of Object.entries(definition.columns)) {
				const migrated = columnsByName.get(name);
				expect(
					migrated,
					`missing migrated column ${definition.name}.${name}`,
				).toBeDefined();
				expect(migrated?.dataType.toLowerCase()).toBe(column.dataType);
			}

			for (const column of table.columns) {
				expect(
					definition.columns[column.name],
					`missing definition for ${definition.name}.${column.name}`,
				).toBeDefined();
			}
		}
	});
});
