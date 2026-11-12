import { describe, expect, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import {
	authorize,
	createOAuthClient,
	OAUTH_PATHS,
	oauthResources,
} from "#shared/helpers/oauth";

const READ_STORIES = `documents:${STORY_KEY}:read`;

describe("starting an OAuth sign-in", () => {
	requires(`collection:${STORY_KEY}`);

	test("sends a valid request to the consent page, and nowhere else", async ({
		lucid,
	}) => {
		const client = await createOAuthClient(await lucid.admin());
		const { content } = await oauthResources(lucid);

		const started = await authorize(lucid.session(), {
			client,
			scope: READ_STORIES,
			resource: content,
		});

		expect(started.status).toBe(303);
		expect(started.location?.origin).toBe(new URL(lucid.url).origin);
		expect(started.requestId).toMatch(/^[A-Za-z0-9_-]{43}$/);
	});

	test("answers itself, without redirecting, when the client or its redirect can't be trusted", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const client = await createOAuthClient(admin);
		const { content } = await oauthResources(lucid);
		const visitor = lucid.session();
		const base = { client, scope: READ_STORIES, resource: content };

		const unknown = await authorize(visitor, {
			...base,
			client: { ...client, clientId: "lucid_oauth_unknown-client-id" },
		});
		const unregistered = await authorize(visitor, {
			...base,
			redirectUri: "https://elsewhere.example/callback",
		});
		const duplicated = await authorize(visitor, {
			...base,
			extra: [["scope", "media:read"]],
		});

		for (const answer of [unknown, unregistered, duplicated]) {
			expect(answer.status).toBe(400);
			expect(answer.location).toBeNull();
		}
		expect(unknown.body).toMatchObject({ error: "invalid_client" });
		expect(unregistered.body).toMatchObject({ error: "invalid_request" });
		expect(duplicated.body).toMatchObject({ error: "invalid_request" });
	});

	test("sends other mistakes back to the client with its state and the issuer", async ({
		lucid,
	}) => {
		const client = await createOAuthClient(await lucid.admin());
		const { content } = await oauthResources(lucid);
		const issuer = (await (
			await lucid.session().fetch(OAUTH_PATHS.serverMetadata)
		).json()) as { issuer: string };
		const visitor = lucid.session();
		const base = {
			client,
			scope: READ_STORIES,
			resource: content,
			state: "harness-state-value-1",
		};

		const cases = {
			unsupported_response_type: { responseType: "token" },
			invalid_request: { method: "plain" },
			invalid_scope: { scope: "documents:missing-collection:read" },
		} as const;
		const wrongResource = await authorize(visitor, {
			...base,
			resource: `${lucid.url}/api/v1/other`,
		});
		expect(wrongResource.location?.searchParams.get("error")).toBe(
			"invalid_request",
		);

		for (const [error, change] of Object.entries(cases)) {
			const answer = await authorize(visitor, { ...base, ...change });
			expect(answer.status, error).toBe(303);
			expect(answer.location?.href.startsWith(client.redirectUri)).toBe(true);
			expect(answer.location?.searchParams.get("error")).toBe(error);
			expect(answer.location?.searchParams.get("state")).toBe(base.state);
			expect(answer.location?.searchParams.get("iss")).toBe(issuer.issuer);
		}
	});

	test("lets a native client pick its loopback port, but nothing else about the redirect", async ({
		lucid,
	}) => {
		const client = await createOAuthClient(await lucid.admin(), {
			redirectUris: ["http://127.0.0.1:4000/harness/callback"],
		});
		const { content } = await oauthResources(lucid);
		const base = { client, scope: READ_STORIES, resource: content };

		const otherPort = await authorize(lucid.session(), {
			...base,
			redirectUri: "http://127.0.0.1:51234/harness/callback",
		});
		const otherPath = await authorize(lucid.session(), {
			...base,
			redirectUri: "http://127.0.0.1:51234/harness/elsewhere",
		});

		expect(otherPort.requestId).not.toBeNull();
		expect(otherPath.status).toBe(400);
	});

	test("refuses a disabled client", async ({ lucid }) => {
		const admin = await lucid.admin();
		const client = await createOAuthClient(admin);
		const disabled = await admin.request({
			method: "PATCH",
			path: `/api/v1/integrations/oauth-clients/${client.id}`,
			body: { enabled: false },
		});
		expect(disabled.status).toBe(200);

		const started = await authorize(lucid.session(), {
			client,
			scope: READ_STORIES,
			resource: (await oauthResources(lucid)).content,
		});

		expect(started.status).toBe(400);
		expect(started.body).toMatchObject({ error: "invalid_client" });
	});

	describe("for the MCP server", () => {
		requires("feature:mcp");

		test("accepts the MCP server as the resource", async ({ lucid }) => {
			const client = await createOAuthClient(await lucid.admin());
			const { mcp } = await oauthResources(lucid);

			const started = await authorize(lucid.session(), {
				client,
				scope: "mcp:access",
				resource: mcp,
			});

			expect(started.requestId).not.toBeNull();
		});
	});
});
