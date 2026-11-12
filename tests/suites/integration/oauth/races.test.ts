import { describe, expect, type Lucid, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import {
	authorize,
	callContent,
	connectClient,
	createOAuthClient,
	createPkce,
	decide,
	exchangeCode,
	oauthResources,
	readCallback,
	refreshTokens,
} from "#shared/oauth";

const READ_STORIES = `documents:${STORY_KEY}:read`;
const STORIES_PATH = `documents/${STORY_KEY}?version=latest`;
const RACERS = 6;

const racers = <T>(send: () => Promise<T>) =>
	Promise.all(Array.from({ length: RACERS }, send));

/**
 * Starts client authorization and returns its consent request. Create the client before advancing
 * the clock to avoid invalidating the shared admin session.
 */
const startSignIn = async (lucid: Lucid) => {
	const person = await lucid.user({ permissions: [READ_STORIES] });
	const client = await createOAuthClient(await lucid.admin());
	const { content } = await oauthResources(lucid);
	const pkce = createPkce();
	const started = await authorize(person.session, {
		client,
		scope: READ_STORIES,
		resource: content,
		challenge: pkce.challenge,
	});
	return {
		person,
		client,
		pkce,
		resource: content,
		requestId: started.requestId ?? "",
	};
};

describe("OAuth requests sent at once", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	test("one consent request gives one code", async ({ lucid }) => {
		const { person, requestId } = await startSignIn(lucid);

		const answers = await racers(() =>
			decide(person.session, requestId, {
				decision: "allow",
				principalType: "user",
			}),
		);

		expect(answers.filter((answer) => answer.ok)).toHaveLength(1);
		const connections = await person.session.request<{ data: unknown[] }>({
			path: "/api/v1/account/oauth-connections",
		});
		expect(connections.body.data).toHaveLength(1);
	});

	test("one code gives tokens at most once, and racing for it ends them", async ({
		lucid,
	}) => {
		const { person, client, pkce, resource, requestId } =
			await startSignIn(lucid);
		const allowed = await decide(person.session, requestId, {
			decision: "allow",
			principalType: "user",
		});
		const code = readCallback(allowed.body.data.redirectUrl).code ?? "";

		const answers = await racers(() =>
			exchangeCode(lucid.session(), {
				client,
				code,
				verifier: pkce.verifier,
				resource,
			}),
		);
		const issued = answers.filter((answer) => answer.status === 200);

		expect(issued.length).toBeLessThanOrEqual(1);
		for (const answer of issued) {
			expect(
				(await callContent(lucid, answer.body.access_token, STORIES_PATH))
					.status,
			).toBe(401);
		}
	});

	test("one refresh token rotates at most once, and racing for it ends the connection", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const client = await createOAuthClient(await lucid.admin());
		const tokens = await connectClient(lucid, {
			person: person.session,
			client,
			scope: READ_STORIES,
		});

		const answers = await racers(() =>
			refreshTokens(lucid.session(), {
				client,
				refreshToken: tokens.refresh_token,
			}),
		);
		const rotated = answers.filter((answer) => answer.status === 200);

		expect(rotated.length).toBeLessThanOrEqual(1);
		for (const answer of rotated) {
			expect(
				(await callContent(lucid, answer.body.access_token, STORIES_PATH))
					.status,
			).toBe(401);
			expect(
				(
					await refreshTokens(lucid.session(), {
						client,
						refreshToken: answer.body.refresh_token,
					})
				).status,
			).toBe(400);
		}
		expect(
			(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
		).toBe(401);
	});
});
