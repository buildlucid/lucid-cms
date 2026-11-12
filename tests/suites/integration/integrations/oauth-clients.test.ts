import { describe, expect, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import {
	authorize,
	callContent,
	connectClient,
	createOAuthClient,
	OAUTH_PATHS,
	oauthResources,
} from "#shared/oauth";
import { uniqueName } from "#shared/permissions";

const READ_STORIES = `documents:${STORY_KEY}:read`;
const CLIENTS_PATH = "/api/v1/integrations/oauth-clients";

type Client = {
	id: number;
	clientId: string;
	authMethod: "none" | "client_secret_basic";
	redirectUris: string[];
	enabled: boolean;
};

describe("OAuth clients", () => {
	requires(`collection:${STORY_KEY}`);

	test("show a confidential client's secret only when it's made or regenerated", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const client = await createOAuthClient(admin, {
			authMethod: "client_secret_basic",
		});

		const read = await admin.request<{ data: Client }>({
			path: `${CLIENTS_PATH}/${client.id}`,
		});
		const listed = await admin.request({ path: CLIENTS_PATH });

		expect(read.body.data).toMatchObject({
			clientId: client.clientId,
			authMethod: "client_secret_basic",
			enabled: true,
		});
		expect(JSON.stringify(read.body)).not.toContain(client.clientSecret);
		expect(JSON.stringify(listed.body)).not.toContain(client.clientSecret);
	});

	test("public clients have no secret to regenerate", async ({ lucid }) => {
		const admin = await lucid.admin();
		const client = await createOAuthClient(admin);

		const regenerated = await admin.request({
			method: "POST",
			path: `${CLIENTS_PATH}/${client.id}/regenerate-secret`,
		});

		expect(client.clientSecret).toBeNull();
		expect(regenerated.status).toBe(400);
	});

	test("refuse redirects that could leak a code", async ({ lucid }) => {
		const admin = await lucid.admin();
		const create = (redirectUris: string[]) =>
			admin.request({
				method: "POST",
				path: CLIENTS_PATH,
				body: {
					name: uniqueName("Leaky app"),
					authMethod: "none",
					redirectUris,
				},
			});

		expect((await create(["http://app.example/callback"])).status).toBe(400);
		expect(
			(await create(["https://app.example/callback#fragment"])).status,
		).toBe(400);
		expect(
			(await create(["https://user:pass@app.example/callback"])).status,
		).toBe(400);
		expect((await create(["https://app.example/callback"])).ok).toBe(true);
	});

	test("changing the redirects drops sign-ins started for the old ones", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const client = await createOAuthClient(admin);
		const { content } = await oauthResources(lucid);
		const waiting = await authorize(lucid.session(), {
			client,
			scope: READ_STORIES,
			resource: content,
		});
		expect(waiting.requestId).not.toBeNull();

		const updated = await admin.request<{ data: Client }>({
			method: "PATCH",
			path: `${CLIENTS_PATH}/${client.id}`,
			body: { redirectUris: ["https://app.example/new-callback"] },
		});
		expect(updated.body.data.redirectUris).toEqual([
			"https://app.example/new-callback",
		]);

		const viewer = await lucid.user({ permissions: [READ_STORIES] });
		const pending = await viewer.session.request({
			path: OAUTH_PATHS.authorization(waiting.requestId ?? ""),
		});
		const oldRedirect = await authorize(lucid.session(), {
			client,
			scope: READ_STORIES,
			resource: content,
		});
		expect(pending.status).toBe(404);
		expect(oldRedirect.status).toBe(400);
	});

	describe("disabled and enabled again", () => {
		requires("harness:outbox");

		test("don't bring back the connections disabling ended", async ({
			lucid,
		}) => {
			const admin = await lucid.admin();
			const person = await lucid.user({ permissions: [READ_STORIES] });
			const client = await createOAuthClient(admin);
			const tokens = await connectClient(lucid, {
				person: person.session,
				client,
				scope: READ_STORIES,
			});
			const path = `${CLIENTS_PATH}/${client.id}`;

			await admin.request({ method: "PATCH", path, body: { enabled: false } });
			await admin.request({ method: "PATCH", path, body: { enabled: true } });

			expect(
				(
					await callContent(
						lucid,
						tokens.access_token,
						`documents/${STORY_KEY}?version=latest`,
					)
				).status,
			).toBe(401);
			//* the client itself works again, for new sign-ins
			const again = await connectClient(lucid, {
				person: person.session,
				client,
				scope: READ_STORIES,
			});
			expect(again.access_token).toBeTruthy();
		});
	});
});
