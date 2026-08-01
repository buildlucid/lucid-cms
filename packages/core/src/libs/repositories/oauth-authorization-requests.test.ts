import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import OAuthAuthorizationRequestsRepository from "./oauth-authorization-requests";

describe("Tests for the OAuth authorization requests repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	await db.migrateCoreToLatest(connection);
	const OAuthAuthorizationRequests = new OAuthAuthorizationRequestsRepository(
		connection.client,
		db,
	);
	const tables = await connection.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find(
			(t) => t.name === OAuthAuthorizationRequests.tableName,
		);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(OAuthAuthorizationRequests.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});

	test("selects an active request with its client logo", async () => {
		const logo = await connection.client
			.insertInto("lucid_media")
			.values({
				key: "oauth-authorization-logo",
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

		await connection.client
			.insertInto("lucid_oauth_authorization_requests")
			.values({
				request_id: "active-request",
				client_id: "oauth-client",
				client_name: "OAuth client",
				client_logo_media_id: logo.id,
				redirect_uri: "https://example.com/callback",
				resource: "https://example.com/content",
				scopes: "media:read",
				state: "state",
				code_challenge: "challenge",
				expires_at: "2099-01-02T00:00:00.000Z",
			})
			.execute();

		const requestRes =
			await OAuthAuthorizationRequests.selectSingleActiveWithLogo({
				requestId: "active-request",
				currentTime: "2099-01-01T00:00:00.000Z",
				validation: {
					enabled: true,
				},
			});

		expect(requestRes.error).toBeUndefined();
		expect(requestRes.data.client_logo).toMatchObject([
			{
				id: logo.id,
				key: "oauth-authorization-logo",
				crop: [],
				translations: [],
			},
		]);

		const expiredRes =
			await OAuthAuthorizationRequests.selectSingleActiveWithLogo({
				requestId: "active-request",
				currentTime: "2100-01-01T00:00:00.000Z",
			});
		expect(expiredRes).toEqual({
			error: undefined,
			data: undefined,
		});
	});
});
