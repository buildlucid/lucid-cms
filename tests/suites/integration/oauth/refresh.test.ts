import {
	advanceClock,
	describe,
	expect,
	type Lucid,
	requires,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import {
	callContent,
	connectClient,
	createOAuthClient,
	OAUTH_PATHS,
	refreshTokens,
	revokeToken,
} from "#shared/oauth";

const READ_STORIES = `documents:${STORY_KEY}:read`;
const STORIES_PATH = `documents/${STORY_KEY}?version=latest`;

/** Connects a new public client for a new person who can read stories. */
const connect = async (lucid: Lucid) => {
	const person = await lucid.user({ permissions: [READ_STORIES] });
	const client = await createOAuthClient(await lucid.admin());
	const tokens = await connectClient(lucid, {
		person: person.session,
		client,
		scope: READ_STORIES,
	});
	return { person, client, tokens };
};

/** The person's connections, as their account page lists them. */
const listConnections = async (
	session: Awaited<ReturnType<Lucid["user"]>>["session"],
) =>
	(
		await session.request<{ data: Array<{ id: number; clientId: string }> }>({
			path: "/api/v1/account/oauth-connections",
		})
	).body.data;

describe("refreshing OAuth tokens", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	test("rotates the refresh token each time it's used", async ({ lucid }) => {
		const { client, tokens } = await connect(lucid);

		const first = await refreshTokens(lucid.session(), {
			client,
			refreshToken: tokens.refresh_token,
			resource: tokens.resource,
		});
		const second = await refreshTokens(lucid.session(), {
			client,
			refreshToken: first.body.refresh_token,
		});

		expect(first.status).toBe(200);
		expect(second.status).toBe(200);
		expect(first.body.refresh_token).not.toBe(tokens.refresh_token);
		expect(first.body.scope).toBe(READ_STORIES);
		expect(
			(await callContent(lucid, second.body.access_token, STORIES_PATH)).status,
		).toBe(200);
	});

	test("ends the whole family when an old refresh token comes back", async ({
		lucid,
	}) => {
		const { client, tokens } = await connect(lucid);
		const rotated = await refreshTokens(lucid.session(), {
			client,
			refreshToken: tokens.refresh_token,
		});
		expect(rotated.status).toBe(200);

		const replayed = await refreshTokens(lucid.session(), {
			client,
			refreshToken: tokens.refresh_token,
		});
		const latest = await refreshTokens(lucid.session(), {
			client,
			refreshToken: rotated.body.refresh_token,
		});

		expect(replayed.status).toBe(400);
		expect(replayed.body).toMatchObject({ error: "invalid_grant" });
		expect(latest.status).toBe(400);
	});

	test("refuses another client's refresh token, or one for another resource, without ending it", async ({
		lucid,
	}) => {
		const { client, tokens } = await connect(lucid);
		const other = await createOAuthClient(await lucid.admin());

		const asOther = await refreshTokens(lucid.session(), {
			client: other,
			refreshToken: tokens.refresh_token,
		});
		const elsewhere = await refreshTokens(lucid.session(), {
			client,
			refreshToken: tokens.refresh_token,
			resource: `${lucid.url}/mcp`,
		});

		expect(asOther.status).toBe(400);
		expect(elsewhere.status).toBe(400);
		expect(
			(
				await refreshTokens(lucid.session(), {
					client,
					refreshToken: tokens.refresh_token,
				})
			).status,
		).toBe(200);
	});

	describe("revoking", () => {
		test("a refresh token ends the connection and the access tokens issued for it", async ({
			lucid,
		}) => {
			const { person, client, tokens } = await connect(lucid);
			expect(await listConnections(person.session)).toHaveLength(1);

			const revoked = await revokeToken(lucid.session(), {
				client,
				token: tokens.refresh_token,
			});

			expect(revoked.status).toBe(200);
			expect(
				(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
			).toBe(401);
			expect(
				(
					await refreshTokens(lucid.session(), {
						client,
						refreshToken: tokens.refresh_token,
					})
				).status,
			).toBe(400);
			expect(await listConnections(person.session)).toEqual([]);
		});

		test("an access token does the same", async ({ lucid }) => {
			const { person, client, tokens } = await connect(lucid);

			const revoked = await revokeToken(lucid.session(), {
				client,
				token: tokens.access_token,
			});

			expect(revoked.status).toBe(200);
			expect(
				(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
			).toBe(401);
			expect(await listConnections(person.session)).toEqual([]);
		});

		test("ignores unknown tokens and other clients' tokens", async ({
			lucid,
		}) => {
			const { client, tokens } = await connect(lucid);
			const other = await createOAuthClient(await lucid.admin());

			const unknown = await revokeToken(lucid.session(), {
				client,
				token: "a".repeat(43),
			});
			const othersToken = await revokeToken(lucid.session(), {
				client: other,
				token: tokens.refresh_token,
			});
			const unsigned = await revokeToken(lucid.session(), {
				client,
				token: `${tokens.access_token.slice(0, -4)}AAAA`,
			});

			expect(unknown.status).toBe(200);
			expect(othersToken.status).toBe(200);
			expect(unsigned.status).toBe(200);
			expect(
				(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
			).toBe(200);
		});

		test("needs the client to say who it is", async ({ lucid }) => {
			const { tokens } = await connect(lucid);

			const anonymous = await lucid.session().fetch(OAUTH_PATHS.revoke, {
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({ token: tokens.refresh_token }).toString(),
			});

			expect(anonymous.status).toBe(401);
			expect(await anonymous.json()).toMatchObject({ error: "invalid_client" });
		});
	});

	describe("after time passes", () => {
		requires("mode:host");

		test("access tokens last five minutes, and say so when refused", async ({
			lucid,
		}) => {
			const { tokens } = await connect(lucid);

			advanceClock(5 * 60_000 + 1_000);
			const late = await callContent(lucid, tokens.access_token, STORIES_PATH);

			expect(late.status).toBe(401);
			expect(late.headers.get("www-authenticate")).toContain(
				'error="invalid_token"',
			);
		});

		test("refresh tokens last thirty days", async ({ lucid }) => {
			const { client, tokens } = await connect(lucid);

			advanceClock(30 * 24 * 60 * 60_000 + 60_000);
			const late = await refreshTokens(lucid.session(), {
				client,
				refreshToken: tokens.refresh_token,
			});

			expect(late.status).toBe(400);
			expect(late.body).toMatchObject({ error: "invalid_grant" });
		});
	});
});
