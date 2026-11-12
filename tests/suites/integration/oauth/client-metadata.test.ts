import { describe, expect, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import {
	authorize,
	callContent,
	connectClient,
	metadataClient,
	OAUTH_PATHS,
	oauthResources,
	refreshTokens,
} from "#shared/oauth";

const READ_STORIES = `documents:${STORY_KEY}:read`;

describe("clients known by their metadata document", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	test("sign in without being registered first, under the name their document gives", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const client = metadataClient(lucid, "valid");
		const started = await authorize(person.session, {
			client,
			scope: READ_STORIES,
			resource: (await oauthResources(lucid)).content,
		});
		const shown = await person.session.request<{
			data: { clientId: string; clientName: string };
		}>({ path: OAUTH_PATHS.authorization(started.requestId ?? "") });
		expect(shown.body.data).toEqual(
			expect.objectContaining({
				clientId: client.clientId,
				clientName: "Harness Metadata App",
			}),
		);

		const tokens = await connectClient(lucid, {
			person: person.session,
			client,
			scope: READ_STORIES,
		});
		const refreshed = await refreshTokens(lucid.session(), {
			client,
			refreshToken: tokens.refresh_token,
		});

		expect(refreshed.status).toBe(200);
		expect(
			(
				await callContent(
					lucid,
					refreshed.body.access_token,
					`documents/${STORY_KEY}?version=latest`,
				)
			).status,
		).toBe(200);
	});

	test.for([
		["wrong-type", "isn't served as JSON"],
		["oversized", "is too large"],
		["other-id", "names another client"],
		["confidential", "asks for a client secret"],
		["unsafe-redirect", "sends people to an unsafe address"],
		["moved", "redirects elsewhere"],
		["missing", "isn't there"],
	] as const)(
		"refuses a client whose document %s (%s)",
		async ([scenario], { lucid }) => {
			const started = await authorize(lucid.session(), {
				client: metadataClient(lucid, scenario),
				scope: READ_STORIES,
				resource: (await oauthResources(lucid)).content,
			});

			expect(started.status).toBe(400);
			expect(started.location).toBeNull();
			expect(started.body).toMatchObject({ error: "invalid_client" });
		},
	);

	test("gives up on a document that takes too long", async ({ lucid }) => {
		const startedAt = Date.now();
		const started = await authorize(lucid.session(), {
			client: metadataClient(lucid, "slow"),
			scope: READ_STORIES,
			resource: (await oauthResources(lucid)).content,
		});

		expect(started.status).toBe(400);
		expect(Date.now() - startedAt).toBeLessThan(6_000);
	});

	test("only fetches local documents from the CMS's own host name", async ({
		lucid,
	}) => {
		const cmsHost = new URL(lucid.url).hostname;
		const elsewhere = cmsHost === "127.0.0.1" ? "localhost" : "127.0.0.1";

		const started = await authorize(lucid.session(), {
			client: metadataClient(lucid, "valid", { hostname: elsewhere }),
			scope: READ_STORIES,
			resource: (await oauthResources(lucid)).content,
		});

		expect(started.status).toBe(400);
		expect(started.body).toMatchObject({ error: "invalid_client" });
	});
});
