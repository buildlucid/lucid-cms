import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import OAuthClientRedirectUrisRepository from "./oauth-client-redirect-uris";

describe("Tests for the OAuth client redirect URIs repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	await db.migrateCoreToLatest(connection);
	const OAuthClientRedirectUris = new OAuthClientRedirectUrisRepository(
		connection.client,
		db,
	);
	const tables = await connection.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find(
			(t) => t.name === OAuthClientRedirectUris.tableName,
		);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(OAuthClientRedirectUris.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});
});
