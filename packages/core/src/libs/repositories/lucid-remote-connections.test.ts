import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import LucidRemoteConnectionsRepository from "./lucid-remote-connections.js";

describe("Tests for the Lucid remote connections repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	await db.migrateCoreToLatest(connection);
	const LucidRemoteConnections = new LucidRemoteConnectionsRepository(
		connection.client,
		db,
	);
	const tables = await connection.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find(
			(candidate) => candidate.name === LucidRemoteConnections.tableName,
		);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			expect(
				// @ts-expect-error
				LucidRemoteConnections.columnFormats[column.name],
			).toEqual(column.dataType.toLowerCase());
		}
	});
});
