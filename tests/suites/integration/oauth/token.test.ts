import {
	advanceClock,
	describe,
	expect,
	requires,
	test,
} from "#harness/vitest";
import type { Lucid, Session } from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import {
	authorize,
	callContent,
	createOAuthClient,
	createPkce,
	decide,
	exchangeCode,
	type OAuthClient,
	OAUTH_PATHS,
	oauthResources,
	postForm,
	readCallback,
	readClaims,
	refreshTokens,
} from "#shared/helpers/oauth";

const READ_STORIES = `documents:${STORY_KEY}:read`;
const STORIES_PATH = `documents/${STORY_KEY}?version=latest`;

/** Gets a fresh authorization code for the client, allowed by the person. */
const issueCode = async (
	lucid: Lucid,
	person: Session,
	client: OAuthClient,
) => {
	const { content } = await oauthResources(lucid);
	const pkce = createPkce();
	const started = await authorize(person, {
		client,
		scope: READ_STORIES,
		resource: content,
		challenge: pkce.challenge,
	});
	const decided = await decide(person, started.requestId ?? "", {
		decision: "allow",
		principalType: "user",
	});
	expect(decided.status, JSON.stringify(decided.body)).toBe(200);
	const { code } = readCallback(decided.body.data.redirectUrl);
	return { code: code ?? "", verifier: pkce.verifier, resource: content };
};

describe("exchanging an authorization code", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	test("gives a public client short-lived tokens for the person who allowed it", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const client = await createOAuthClient(await lucid.admin());
		const issued = await issueCode(lucid, person.session, client);

		const exchanged = await exchangeCode(lucid.session(), {
			client,
			...issued,
		});

		expect(exchanged.status).toBe(200);
		expect(exchanged.headers.get("cache-control")).toBe("no-store");
		expect(exchanged.body).toMatchObject({
			token_type: "Bearer",
			expires_in: 300,
			scope: READ_STORIES,
		});
		expect(readClaims(exchanged.body.access_token)).toMatchObject({
			aud: issued.resource,
			sub: `user:${person.id}`,
			client_id: client.clientId,
		});
		expect(
			(await callContent(lucid, exchanged.body.access_token, STORIES_PATH))
				.status,
		).toBe(200);
	});

	test("refuses a code sent with the wrong verifier, redirect, resource or client", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const admin = await lucid.admin();
		const client = await createOAuthClient(admin, {
			redirectUris: [
				"http://127.0.0.1/harness/callback",
				"http://127.0.0.1/harness/other",
			],
		});
		const other = await createOAuthClient(admin);
		const issued = await issueCode(lucid, person.session, client);
		const visitor = lucid.session();

		const wrong = [
			{ ...issued, client, verifier: createPkce().verifier },
			{ ...issued, client, redirectUri: "http://127.0.0.1/harness/other" },
			{ ...issued, client, resource: `${issued.resource}/` },
			{ ...issued, client: other },
		];
		for (const attempt of wrong) {
			const answer = await exchangeCode(visitor, attempt);
			expect(answer.status).toBe(400);
			expect(answer.body).toMatchObject({ error: "invalid_grant" });
		}

		//* a refused attempt doesn't use the code up for its own client
		expect((await exchangeCode(visitor, { client, ...issued })).status).toBe(
			200,
		);
	});

	test("works once, and a second try ends the tokens the first one got", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const client = await createOAuthClient(await lucid.admin());
		const issued = await issueCode(lucid, person.session, client);
		const first = await exchangeCode(lucid.session(), { client, ...issued });
		expect(first.status).toBe(200);

		const again = await exchangeCode(lucid.session(), { client, ...issued });

		expect(again.status).toBe(400);
		expect(again.body).toMatchObject({ error: "invalid_grant" });
		expect(
			(await callContent(lucid, first.body.access_token, STORIES_PATH)).status,
		).toBe(401);
		expect(
			(
				await refreshTokens(lucid.session(), {
					client,
					refreshToken: first.body.refresh_token,
				})
			).status,
		).toBe(400);
	});

	describe("with a confidential client", () => {
		test("needs the client's secret, sent with HTTP Basic", async ({
			lucid,
		}) => {
			const person = await lucid.user({ permissions: [READ_STORIES] });
			const client = await createOAuthClient(await lucid.admin(), {
				authMethod: "client_secret_basic",
			});
			expect(client.clientSecret).toMatch(/^lucid_oauth_secret_/);
			const issued = await issueCode(lucid, person.session, client);
			const visitor = lucid.session();
			const form = {
				grant_type: "authorization_code",
				code: issued.code,
				code_verifier: issued.verifier,
				redirect_uri: client.redirectUri,
				resource: issued.resource,
			};

			const withoutSecret = await postForm(
				visitor,
				OAUTH_PATHS.token,
				{ clientId: client.clientId, clientSecret: null },
				form,
			);
			const wrongSecret = await postForm(
				visitor,
				OAUTH_PATHS.token,
				{ clientId: client.clientId, clientSecret: "lucid_oauth_secret_no" },
				form,
			);
			for (const answer of [withoutSecret, wrongSecret]) {
				expect(answer.status).toBe(401);
				expect(answer.body).toMatchObject({ error: "invalid_client" });
				expect(answer.headers.get("www-authenticate")).toContain("Basic");
			}

			expect((await exchangeCode(visitor, { client, ...issued })).status).toBe(
				200,
			);
		});

		test("stops taking the old secret once it's regenerated", async ({
			lucid,
		}) => {
			const person = await lucid.user({ permissions: [READ_STORIES] });
			const admin = await lucid.admin();
			const client = await createOAuthClient(admin, {
				authMethod: "client_secret_basic",
			});
			const regenerated = await admin.request<{
				data: { clientSecret: string };
			}>({
				method: "POST",
				path: `/api/v1/integrations/oauth-clients/${client.id}/regenerate-secret`,
			});
			expect(regenerated.status).toBe(200);
			const issued = await issueCode(lucid, person.session, client);

			const old = await exchangeCode(lucid.session(), { client, ...issued });
			const renewed = await exchangeCode(lucid.session(), {
				client: { ...client, clientSecret: regenerated.body.data.clientSecret },
				...issued,
			});

			expect(old.status).toBe(401);
			expect(renewed.status).toBe(200);
		});
	});

	test("refuses a public client that sends a secret, and requests it can't read", async ({
		lucid,
	}) => {
		const client = await createOAuthClient(await lucid.admin());
		const visitor = lucid.session();
		const form = {
			grant_type: "authorization_code",
			code: "a".repeat(43),
			code_verifier: "b".repeat(43),
			redirect_uri: client.redirectUri,
			resource: `${lucid.url}/api/v1/content`,
		};

		const withSecret = await postForm(
			visitor,
			OAUTH_PATHS.token,
			{ ...client, clientSecret: "lucid_oauth_secret_unwanted" },
			form,
		);
		const asJson = await visitor.fetch(OAUTH_PATHS.token, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ ...form, client_id: client.clientId }),
		});
		const otherGrant = await postForm(visitor, OAUTH_PATHS.token, client, {
			grant_type: "client_credentials",
		});

		expect(withSecret.status).toBe(401);
		expect(asJson.status).toBe(400);
		expect(await asJson.json()).toMatchObject({ error: "invalid_request" });
		expect(otherGrant.status).toBe(400);
		expect(otherGrant.body).toMatchObject({ error: "unsupported_grant_type" });
	});

	describe("after time passes", () => {
		requires("mode:host");

		test("refuses a code older than five minutes", async ({ lucid }) => {
			const person = await lucid.user({ permissions: [READ_STORIES] });
			const client = await createOAuthClient(await lucid.admin());
			const issued = await issueCode(lucid, person.session, client);

			advanceClock(5 * 60_000 + 1_000);
			const late = await exchangeCode(lucid.session(), { client, ...issued });

			expect(late.status).toBe(400);
			expect(late.body).toMatchObject({ error: "invalid_grant" });
		});
	});
});
