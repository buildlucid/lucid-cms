import {
	advanceClock,
	describe,
	expect,
	type Lucid,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import {
	authorize,
	createOAuthClient,
	createPkce,
	decide,
	exchangeCode,
	type OAuthClient,
	OAUTH_PATHS,
	oauthResources,
	readCallback,
	readClaims,
} from "#shared/oauth";

const READ_STORIES = `documents:${STORY_KEY}:read`;

type AuthorizationRequest = {
	clientId: string;
	clientName: string;
	scopes: string[];
	userScopes: string[];
	systemScopes: string[];
	canConnectAsSystem: boolean;
};

/**
 * Starts client authorization and returns its consent request. Create the client before advancing
 * the clock to avoid invalidating the shared admin session.
 */
const startConsent = async (
	lucid: Lucid,
	person: Session,
	scope: string,
	options: { state?: string; client?: OAuthClient } = {},
) => {
	const state = options.state ?? "harness-consent-state";
	const client =
		options.client ??
		(await createOAuthClient(await lucid.admin(), {
			name: "Harness Consent App",
		}));
	const { content } = await oauthResources(lucid);
	const pkce = createPkce();
	const started = await authorize(person, {
		client,
		scope,
		resource: content,
		challenge: pkce.challenge,
		state,
	});
	expect(started.requestId).not.toBeNull();
	return {
		client,
		requestId: started.requestId ?? "",
		pkce,
		resource: content,
	};
};

const readRequest = (person: Session, requestId: string) =>
	person.request<{ data: AuthorizationRequest }>({
		path: OAUTH_PATHS.authorization(requestId),
	});

describe("the consent page", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	test("shows the client and only the scopes the person can give it", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const { requestId, client } = await startConsent(
			lucid,
			person.session,
			`${READ_STORIES} media:read`,
		);

		const shown = await readRequest(person.session, requestId);

		expect(shown.status).toBe(200);
		expect(shown.body.data).toMatchObject({
			clientId: client.clientId,
			clientName: "Harness Consent App",
			scopes: [READ_STORIES, "media:read"],
			userScopes: [READ_STORIES],
			canConnectAsSystem: false,
		});
	});

	test("is only for people who are signed in", async ({ lucid }) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const { requestId } = await startConsent(
			lucid,
			person.session,
			READ_STORIES,
		);
		const visitor = lucid.session();

		expect((await readRequest(visitor, requestId)).status).toBe(401);
		expect(
			(
				await decide(visitor, requestId, {
					decision: "allow",
					principalType: "user",
				})
			).status,
		).toBe(401);
	});

	test("allowing sends the client a code for just the scopes the person holds", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const { requestId, client, pkce, resource } = await startConsent(
			lucid,
			person.session,
			`${READ_STORIES} media:read`,
		);

		const allowed = await decide(person.session, requestId, {
			decision: "allow",
			principalType: "user",
		});
		const callback = readCallback(allowed.body.data.redirectUrl);
		const exchanged = await exchangeCode(lucid.session(), {
			client,
			code: callback.code ?? "",
			verifier: pkce.verifier,
			resource,
		});

		expect(allowed.status).toBe(200);
		expect(callback.url.href.startsWith(client.redirectUri)).toBe(true);
		expect(callback.state).toBe("harness-consent-state");
		expect(callback.iss).toBe(new URL(lucid.url).origin);
		expect(exchanged.body.scope).toBe(READ_STORIES);
	});

	test("refuses when the person can give none of the scopes asked for", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const { requestId } = await startConsent(
			lucid,
			person.session,
			"media:read",
		);

		const allowed = await decide(person.session, requestId, {
			decision: "allow",
			principalType: "user",
		});

		expect(allowed.status).toBe(403);
	});

	test("denying sends the client back with access_denied and no code", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const { requestId } = await startConsent(
			lucid,
			person.session,
			READ_STORIES,
		);

		const denied = await decide(person.session, requestId, {
			decision: "deny",
		});
		const callback = readCallback(denied.body.data.redirectUrl);

		expect(callback.error).toBe("access_denied");
		expect(callback.code).toBeNull();
		expect(callback.state).toBe("harness-consent-state");
		expect((await readRequest(person.session, requestId)).status).toBe(404);
	});

	test("takes one decision per request", async ({ lucid }) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const { requestId } = await startConsent(
			lucid,
			person.session,
			READ_STORIES,
		);
		const allow = () =>
			decide(person.session, requestId, {
				decision: "allow",
				principalType: "user",
			});

		expect((await allow()).status).toBe(200);
		expect((await allow()).status).toBe(400);
		expect(
			(await decide(person.session, requestId, { decision: "deny" })).status,
		).toBe(400);
	});

	describe("connecting for the whole site", () => {
		test("needs permission to create integrations", async ({ lucid }) => {
			const person = await lucid.user({ permissions: [READ_STORIES] });
			const { requestId } = await startConsent(
				lucid,
				person.session,
				READ_STORIES,
			);

			const asSystem = await decide(person.session, requestId, {
				decision: "allow",
				principalType: "system",
			});

			expect(asSystem.status).toBe(403);
			//* the refused try leaves the request for the person to allow for themselves
			expect(
				(
					await decide(person.session, requestId, {
						decision: "allow",
						principalType: "user",
					})
				).status,
			).toBe(200);
		});

		test("gives the client the scopes asked for, whatever the person holds", async ({
			lucid,
		}) => {
			const person = await lucid.user({
				permissions: ["integrations:create", "integrations:read"],
			});
			const { requestId, client, pkce, resource } = await startConsent(
				lucid,
				person.session,
				`${READ_STORIES} media:read`,
			);
			const shown = await readRequest(person.session, requestId);
			expect(shown.body.data).toMatchObject({
				canConnectAsSystem: true,
				userScopes: [],
				systemScopes: [READ_STORIES, "media:read"],
			});

			const allowed = await decide(person.session, requestId, {
				decision: "allow",
				principalType: "system",
			});
			const exchanged = await exchangeCode(lucid.session(), {
				client,
				code: readCallback(allowed.body.data.redirectUrl).code ?? "",
				verifier: pkce.verifier,
				resource,
			});

			expect(exchanged.status).toBe(200);
			expect(exchanged.body.scope.split(" ").toSorted()).toEqual(
				["media:read", READ_STORIES].toSorted(),
			);
			expect(readClaims(exchanged.body.access_token).sub).toMatch(/^system:/);
		});
	});

	describe("after time passes", () => {
		requires("mode:host");

		test("needs the person to have signed in within ten minutes to allow", async ({
			lucid,
		}) => {
			const person = await lucid.user({ permissions: [READ_STORIES] });
			const client = await createOAuthClient(await lucid.admin());
			advanceClock(10 * 60_000 + 30_000);
			//* the access cookie has expired by now, and refreshing keeps how old the login is
			expect(
				(
					await person.session.request({
						method: "POST",
						path: "/api/v1/auth/token",
					})
				).ok,
			).toBe(true);
			const { requestId } = await startConsent(
				lucid,
				person.session,
				READ_STORIES,
				{ client },
			);

			const allowed = await decide(person.session, requestId, {
				decision: "allow",
				principalType: "user",
			});
			expect(allowed.status).toBe(403);
			expect(allowed.body).toMatchObject({ code: "reauthentication_required" });

			const confirmed = await person.session.request({
				method: "POST",
				path: "/api/v1/account/reauthenticate",
				body: { password: person.credentials.password },
			});
			expect(confirmed.ok, JSON.stringify(confirmed.body)).toBe(true);
			expect(
				(
					await decide(person.session, requestId, {
						decision: "allow",
						principalType: "user",
					})
				).status,
			).toBe(200);
		});

		test("a request lasts five minutes", async ({ lucid }) => {
			const person = await lucid.user({ permissions: [READ_STORIES] });
			const { requestId } = await startConsent(
				lucid,
				person.session,
				READ_STORIES,
			);

			advanceClock(5 * 60_000 + 1_000);
			await person.session.request({
				method: "POST",
				path: "/api/v1/auth/token",
			});

			expect((await readRequest(person.session, requestId)).status).toBe(404);
			expect(
				(
					await decide(person.session, requestId, {
						decision: "allow",
						principalType: "user",
					})
				).status,
			).toBe(400);
		});
	});
});
