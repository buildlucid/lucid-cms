import type { Integration } from "@lucidcms/core/types";
import {
	advanceClock,
	describe,
	expect,
	type Lucid,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import { createApiKey, KEY_PATHS } from "#shared/helpers/integrations";
import { callContent } from "#shared/helpers/oauth";
import { uniqueName } from "#shared/helpers/permissions";

const READ_STORIES = `documents:${STORY_KEY}:read`;
const STORIES_PATH = `documents/${STORY_KEY}?version=latest`;

/** Makes a site API key as the session. */
const createKey = (
	session: Session,
	body: { scopes: string[]; expiry?: string; enabled?: boolean },
) => createApiKey(session, "site", body);

const readKey = async (session: Session, id: number) =>
	(
		await session.request<{ data: Integration }>({
			path: `${KEY_PATHS.site}/${id}`,
		})
	).body.data;

const updateKey = (session: Session, id: number, body: object) =>
	session.request({
		method: "PATCH",
		path: `/api/v1/integrations/${id}`,
		body,
	});

const readStories = (lucid: Lucid, apiKey: string) =>
	callContent(lucid, apiKey, STORIES_PATH).then((answer) => answer.status);

describe("site API keys", () => {
	requires(`collection:${STORY_KEY}`);

	test("show their secret once, and never after", async ({ lucid }) => {
		const admin = await lucid.admin();
		const { apiKey, id } = await createKey(admin, { scopes: [READ_STORIES] });

		const read = await admin.request({ path: `/api/v1/integrations/${id}` });
		const listed = await admin.request({ path: "/api/v1/integrations" });

		expect(apiKey.length).toBeGreaterThan(40);
		expect(JSON.stringify(read.body)).not.toContain(apiKey);
		expect(JSON.stringify(listed.body)).not.toContain(apiKey);
		expect(await readKey(admin, id)).toMatchObject({
			userId: null,
			scopes: [READ_STORIES],
			enabled: true,
			expiresAt: null,
		});
	});

	test("are taken in a bearer header, an ApiKey header or X-API-Key, but not two at once", async ({
		lucid,
	}) => {
		const { apiKey } = await createKey(await lucid.admin(), {
			scopes: [READ_STORIES],
		});
		const send = (headers: Record<string, string>) =>
			lucid
				.session()
				.fetch(`/api/v1/content/${STORIES_PATH}`, { headers })
				.then((response) => response.status);

		expect(await send({ authorization: `Bearer ${apiKey}` })).toBe(200);
		expect(await send({ authorization: `ApiKey ${apiKey}` })).toBe(200);
		expect(await send({ "x-api-key": apiKey })).toBe(200);
		expect(
			await send({ authorization: `Bearer ${apiKey}`, "x-api-key": apiKey }),
		).toBe(401);
		expect(await send({ authorization: `Bearer ${apiKey} extra` })).toBe(401);
		expect(await send({ authorization: `Bearer ${apiKey.slice(0, -2)}` })).toBe(
			401,
		);
	});

	test("stop working while disabled, and once deleted", async ({ lucid }) => {
		const admin = await lucid.admin();
		const { apiKey, id } = await createKey(admin, { scopes: [READ_STORIES] });

		expect((await updateKey(admin, id, { enabled: false })).status).toBe(204);
		expect(await readStories(lucid, apiKey)).toBe(401);

		expect((await updateKey(admin, id, { enabled: true })).status).toBe(204);
		expect(await readStories(lucid, apiKey)).toBe(200);

		const deleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/integrations/${id}`,
		});
		expect(deleted.status).toBe(204);
		expect(await readStories(lucid, apiKey)).toBe(401);
	});

	test("get a new secret when regenerated, and the old one stops working", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const { apiKey, id } = await createKey(admin, { scopes: [READ_STORIES] });

		const regenerated = await admin.request<{ data: { apiKey: string } }>({
			method: "POST",
			path: `/api/v1/integrations/${id}/regenerate-keys`,
		});

		expect(regenerated.status).toBe(200);
		expect(await readStories(lucid, apiKey)).toBe(401);
		expect(await readStories(lucid, regenerated.body.data.apiKey)).toBe(200);
	});

	test("use the scopes they're given now, not the ones they were made with", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const { apiKey, id } = await createKey(admin, { scopes: ["media:read"] });
		expect(await readStories(lucid, apiKey)).toBe(403);

		expect(
			(await updateKey(admin, id, { scopes: [READ_STORIES] })).status,
		).toBe(204);

		expect(await readStories(lucid, apiKey)).toBe(200);
		expect((await callContent(lucid, apiKey, "media")).status).toBe(403);
	});

	test("can start with no scopes and be given some later", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const { apiKey, id } = await createKey(admin, { scopes: [] });
		expect(await readStories(lucid, apiKey)).toBe(403);

		const updated = await updateKey(admin, id, { scopes: [READ_STORIES] });

		expect(updated.status, JSON.stringify(updated.body)).toBe(204);
		expect(await readStories(lucid, apiKey)).toBe(200);
	});

	test("refuse scopes that don't exist or are only for people", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const create = (scopes: string[]) =>
			admin.request({
				method: "POST",
				path: "/api/v1/integrations",
				body: { name: uniqueName("Bad key"), scopes },
			});

		expect((await create(["documents:missing:read"])).status).toBe(400);
		expect((await create(["account:read"])).status).toBe(400);
	});

	test("record when they were last used", async ({ lucid }) => {
		const admin = await lucid.admin();
		const { apiKey, id } = await createKey(admin, { scopes: [READ_STORIES] });
		expect((await readKey(admin, id)).lastUsedAt).toBeNull();

		await readStories(lucid, apiKey);

		await expect
			.poll(async () => (await readKey(admin, id)).lastUsedAt)
			.not.toBeNull();
	});

	describe("after time passes", () => {
		requires("mode:host");

		test("stop working once they expire", async ({ lucid }) => {
			const { apiKey } = await createKey(await lucid.admin(), {
				scopes: [READ_STORIES],
				expiry: "30-days",
			});
			expect(await readStories(lucid, apiKey)).toBe(200);

			advanceClock(30 * 24 * 60 * 60_000 + 60_000);

			expect(await readStories(lucid, apiKey)).toBe(401);
		});

		test("record their use at most once a minute", async ({ lucid }) => {
			const admin = await lucid.admin();
			const { apiKey, id } = await createKey(admin, { scopes: [READ_STORIES] });
			await readStories(lucid, apiKey);
			await expect
				.poll(async () => (await readKey(admin, id)).lastUsedAt)
				.not.toBeNull();
			const first = (await readKey(admin, id)).lastUsedAt;

			await readStories(lucid, apiKey);
			await new Promise((resolve) => setTimeout(resolve, 200));
			expect((await readKey(admin, id)).lastUsedAt).toBe(first);

			advanceClock(61_000);
			await readStories(lucid, apiKey);
			await expect
				.poll(async () => (await readKey(admin, id)).lastUsedAt)
				.not.toBe(first);
		});
	});
});

describe("personal API keys", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	const createPersonal = (session: Session, scopes: string[]) =>
		createApiKey(session, "personal", { scopes });

	test("are listed only for their owner", async ({ lucid }) => {
		const owner = await lucid.user({ permissions: [READ_STORIES] });
		const other = await lucid.user({ permissions: [READ_STORIES] });
		const { id } = await createPersonal(owner.session, [READ_STORIES]);

		const ownList = await owner.session.request<{ data: Integration[] }>({
			path: "/api/v1/account/integrations",
		});
		const otherList = await other.session.request<{ data: Integration[] }>({
			path: "/api/v1/account/integrations",
		});
		const otherRead = await other.session.request({
			path: `/api/v1/account/integrations/${id}`,
		});
		const otherDelete = await other.session.request({
			method: "DELETE",
			path: `/api/v1/account/integrations/${id}`,
		});

		expect(ownList.body.data.map((row) => row.id)).toEqual([id]);
		expect(otherList.body.data).toEqual([]);
		expect(otherRead.status).toBe(404);
		expect(otherDelete.status).toBe(404);
	});

	test("can't be given a scope the owner doesn't hold", async ({ lucid }) => {
		const owner = await lucid.user({ permissions: [READ_STORIES] });
		const { apiKey, id } = await createPersonal(owner.session, [READ_STORIES]);

		const widened = await owner.session.request({
			method: "PATCH",
			path: `/api/v1/account/integrations/${id}`,
			body: { scopes: [READ_STORIES, "media:read"] },
		});

		expect(widened.status).toBe(400);
		expect((await callContent(lucid, apiKey, "media")).status).toBe(403);
	});
});
