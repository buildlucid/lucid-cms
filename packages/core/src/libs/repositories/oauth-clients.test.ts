import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import OAuthClientsRepository from "./oauth-clients";

describe("Tests for the OAuth clients repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	await db.migrateToLatest(connection);
	const OAuthClients = new OAuthClientsRepository(connection.client, db);
	const tables = await connection.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === OAuthClients.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(OAuthClients.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});

	test("selects clients with ordered redirect URIs and logos", async () => {
		const logo = await connection.client
			.insertInto("lucid_media")
			.values({
				key: "oauth-client-logo",
				origin: "human",
				type: "image",
				mime_type: "image/png",
				file_extension: "png",
				file_name: "logo.png",
				file_size: 100,
				width: 64,
				height: 64,
			})
			.returning("id")
			.executeTakeFirstOrThrow();
		const olderClient = await connection.client
			.insertInto("lucid_oauth_clients")
			.values({
				client_id: "oauth-client-older",
				name: "Older client",
				token_endpoint_auth_method: "none",
				logo_media_id: logo.id,
				enabled: db.config.defaults.boolean.true,
				created_at: "2026-01-01T00:00:00.000Z",
				updated_at: "2026-01-01T00:00:00.000Z",
			})
			.returning("id")
			.executeTakeFirstOrThrow();
		const newerClient = await connection.client
			.insertInto("lucid_oauth_clients")
			.values({
				client_id: "oauth-client-newer",
				name: "Newer client",
				token_endpoint_auth_method: "client_secret_basic",
				enabled: db.config.defaults.boolean.true,
				created_at: "2026-01-02T00:00:00.000Z",
				updated_at: "2026-01-02T00:00:00.000Z",
			})
			.returning("id")
			.executeTakeFirstOrThrow();

		await connection.client
			.insertInto("lucid_oauth_client_redirect_uris")
			.values([
				{
					oauth_client_id: olderClient.id,
					redirect_uri: "https://example.com/first",
				},
				{
					oauth_client_id: olderClient.id,
					redirect_uri: "https://example.com/second",
				},
			])
			.execute();

		const singleRes = await OAuthClients.selectSingleDetailed({
			id: olderClient.id,
			validation: {
				enabled: true,
			},
		});
		expect(singleRes.error).toBeUndefined();
		expect(singleRes.data.redirect_uris).toEqual([
			{ redirect_uri: "https://example.com/first" },
			{ redirect_uri: "https://example.com/second" },
		]);
		expect(singleRes.data.logo).toMatchObject([
			{
				id: logo.id,
				key: "oauth-client-logo",
				crop: [],
				translations: [],
			},
		]);

		const authorizationClientRes =
			await OAuthClients.selectSingleAuthorizationClient({
				clientId: "oauth-client-older",
				validation: {
					enabled: true,
				},
			});
		expect(authorizationClientRes.error).toBeUndefined();
		expect(authorizationClientRes.data.redirect_uris).toEqual(
			singleRes.data.redirect_uris,
		);

		const multipleRes = await OAuthClients.selectMultipleDetailed({
			validation: {
				enabled: true,
			},
		});
		expect(multipleRes.error).toBeUndefined();
		expect(multipleRes.data.map((client) => client.id)).toEqual([
			newerClient.id,
			olderClient.id,
		]);
		expect(multipleRes.data[0]?.logo).toEqual([]);
	});
});
