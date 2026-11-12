import type { OAuthConnection } from "@lucidcms/core/types";
import { describe, expect, type Lucid, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import {
	authorize,
	callContent,
	connectClient,
	createOAuthClient,
	OAUTH_PATHS,
	oauthResources,
	readClaims,
} from "#shared/helpers/oauth";

const READ_STORIES = `documents:${STORY_KEY}:read`;
const STORIES_PATH = `documents/${STORY_KEY}?version=latest`;

type Person = Awaited<ReturnType<Lucid["user"]>>;

const accountConnections = async (person: Person) =>
	(
		await person.session.request<{ data: OAuthConnection[] }>({
			path: "/api/v1/account/oauth-connections",
		})
	).body.data;

/** Connects a new client for the person and returns its connection's ID and tokens. */
const connect = async (
	lucid: Lucid,
	person: Person,
	options: { principalType?: "user" | "system"; name?: string } = {},
) => {
	const client = await createOAuthClient(await lucid.admin(), {
		name: options.name,
	});
	const tokens = await connectClient(lucid, {
		person: person.session,
		client,
		scope: READ_STORIES,
		principalType: options.principalType,
	});
	return { client, tokens, id: readClaims(tokens.access_token).grant_id };
};

describe("managing OAuth connections", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	test("a person sees their connections, with when each was last used", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const { client, tokens, id } = await connect(lucid, person, {
			name: "Listed App",
		});

		expect(await accountConnections(person)).toEqual([
			expect.objectContaining({
				id,
				name: "Listed App",
				clientId: client.clientId,
				principalType: "user",
				userId: person.id,
				scopes: [READ_STORIES],
				lastUsedAt: null,
			}),
		]);

		await callContent(lucid, tokens.access_token, STORIES_PATH);
		await expect
			.poll(async () => (await accountConnections(person))[0]?.lastUsedAt)
			.not.toBeNull();
	});

	test("a person can rename and revoke their own connection", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const { tokens, id } = await connect(lucid, person);
		const path = `/api/v1/account/oauth-connections/${id}`;

		const renamed = await person.session.request<{ data: OAuthConnection }>({
			method: "PATCH",
			path,
			body: { name: "My Reader" },
		});
		expect(renamed.status).toBe(200);
		expect(renamed.body.data.name).toBe("My Reader");

		const revoked = await person.session.request({ method: "DELETE", path });
		expect(revoked.status).toBe(204);
		expect(await accountConnections(person)).toEqual([]);
		expect(
			(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
		).toBe(401);
	});

	test("nobody else can change a person's connection without managing users", async ({
		lucid,
	}) => {
		const owner = await lucid.user({ permissions: [READ_STORIES] });
		const other = await lucid.user({ permissions: ["users:read"] });
		const { tokens, id } = await connect(lucid, owner);

		const renamed = await other.session.request({
			method: "PATCH",
			path: `/api/v1/account/oauth-connections/${id}`,
			body: { name: "Taken" },
		});
		const revoked = await other.session.request({
			method: "DELETE",
			path: `/api/v1/users/${owner.id}/oauth-connections/${id}`,
		});

		expect(renamed.status).toBe(403);
		expect(revoked.status).toBe(403);
		expect(
			(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
		).toBe(200);
	});

	test("someone who manages users can see and revoke another person's connection", async ({
		lucid,
	}) => {
		const owner = await lucid.user({ permissions: [READ_STORIES] });
		const manager = await lucid.user({
			permissions: ["users:read", "users:update"],
		});
		const { tokens, id } = await connect(lucid, owner);
		const listed = await manager.session.request<{ data: OAuthConnection[] }>({
			path: `/api/v1/users/${owner.id}/oauth-connections`,
		});
		expect(listed.body.data.map((connection) => connection.id)).toEqual([id]);

		//* the connection has to belong to the user named in the path
		const misnamed = await manager.session.request({
			method: "DELETE",
			path: `/api/v1/users/${manager.id}/oauth-connections/${id}`,
		});
		const revoked = await manager.session.request({
			method: "DELETE",
			path: `/api/v1/users/${owner.id}/oauth-connections/${id}`,
		});

		expect(misnamed.status).toBe(404);
		expect(revoked.status).toBe(204);
		expect(
			(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
		).toBe(401);
	});

	test("site connections are listed and revoked by those who manage integrations", async ({
		lucid,
	}) => {
		const creator = await lucid.user({
			permissions: ["integrations:create", "integrations:read"],
		});
		const reader = await lucid.user({ permissions: ["integrations:read"] });
		const remover = await lucid.user({
			permissions: ["integrations:read", "integrations:delete"],
		});
		const { tokens, id } = await connect(lucid, creator, {
			principalType: "system",
		});

		const listed = await reader.session.request<{ data: OAuthConnection[] }>({
			path: "/api/v1/integrations/oauth",
		});
		expect(listed.body.data).toContainEqual(
			expect.objectContaining({ id, principalType: "system", userId: null }),
		);
		expect(await accountConnections(creator)).toEqual([]);

		const path = `/api/v1/integrations/oauth/${id}`;
		expect(
			(await reader.session.request({ method: "DELETE", path })).status,
		).toBe(403);
		expect(
			(await remover.session.request({ method: "DELETE", path })).status,
		).toBe(204);
		expect(
			(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
		).toBe(401);
	});

	describe("when the client changes", () => {
		test("renaming it renames its connections' client", async ({ lucid }) => {
			const person = await lucid.user({ permissions: [READ_STORIES] });
			const { client, id } = await connect(lucid, person);

			const renamed = await (
				await lucid.admin()
			).request({
				method: "PATCH",
				path: `/api/v1/integrations/oauth-clients/${client.id}`,
				body: { name: "Renamed App" },
			});
			expect(renamed.status).toBe(200);

			const [connection] = await accountConnections(person);
			expect(connection).toMatchObject({ id, clientName: "Renamed App" });
		});

		test.for(["disabling", "deleting"] as const)(
			"%s it ends its connections and the sign-ins waiting for consent",
			async (change, { lucid }) => {
				const admin = await lucid.admin();
				const person = await lucid.user({ permissions: [READ_STORIES] });
				const { client, tokens } = await connect(lucid, person);
				const waiting = await authorize(person.session, {
					client,
					scope: READ_STORIES,
					resource: (await oauthResources(lucid)).content,
				});
				expect(waiting.requestId).not.toBeNull();

				const path = `/api/v1/integrations/oauth-clients/${client.id}`;
				const changed =
					change === "disabling"
						? await admin.request({
								method: "PATCH",
								path,
								body: { enabled: false },
							})
						: await admin.request({ method: "DELETE", path });
				expect(changed.ok).toBe(true);

				expect(await accountConnections(person)).toEqual([]);
				expect(
					(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
				).toBe(401);
				expect(
					(
						await person.session.request({
							path: OAUTH_PATHS.authorization(waiting.requestId ?? ""),
						})
					).status,
				).toBe(404);
			},
		);
	});
});
