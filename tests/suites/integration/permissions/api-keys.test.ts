import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import { createDocument } from "#shared/helpers/documents";
import { createApiKey } from "#shared/helpers/integrations";
import { callContent } from "#shared/helpers/oauth";
import { setRolePermissions, uniqueName } from "#shared/helpers/permissions";

const READ_STORIES = `documents:${STORY_KEY}:read`;

/** Makes a personal API key for the signed-in user, and returns its secret. */
const createPersonalKey = async (session: Session, scopes: string[]) =>
	(await createApiKey(session, "personal", { scopes })).apiKey;

describe("personal API keys", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	test("a key's scope works only while its owner holds the permission behind it", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, {
			fields: [{ key: "title", type: "text", value: "Keyed" }],
		});
		const owner = await lucid.user({ permissions: [READ_STORIES] });
		const apiKey = await createPersonalKey(owner.session, [READ_STORIES]);
		const read = () =>
			callContent(
				lucid,
				apiKey,
				`document/${STORY_KEY}?filter[id]=${id}&version=latest`,
			);

		expect((await read()).status).toBe(200);

		await setRolePermissions(admin, owner.roleId ?? 0, []);

		expect((await read()).status).toBe(403);
	});

	test("a key can't use a scope its owner never held", async ({ lucid }) => {
		const owner = await lucid.user({ permissions: [] });
		const created = await owner.session.request<{ data: { apiKey: string } }>({
			method: "POST",
			path: "/api/v1/account/integrations",
			body: { name: uniqueName("Hopeful key"), scopes: [READ_STORIES] },
		});
		//* the CMS may refuse the key outright, or make one that can't use the scope
		if (created.status !== 200) {
			expect(created.status).toBeGreaterThanOrEqual(400);
			return;
		}

		const read = await callContent(
			lucid,
			created.body.data.apiKey,
			`documents/${STORY_KEY}?version=latest`,
		);
		expect(read.status).toBe(403);
	});

	test("a locked user's keys stop working", async ({ lucid }) => {
		const admin = await lucid.admin();
		const owner = await lucid.user({ permissions: [READ_STORIES] });
		const apiKey = await createPersonalKey(owner.session, [READ_STORIES]);
		const read = () =>
			callContent(lucid, apiKey, `documents/${STORY_KEY}?version=latest`);
		expect((await read()).status).toBe(200);

		const locked = await admin.request({
			method: "PATCH",
			path: `/api/v1/users/${owner.id}`,
			body: { isLocked: true },
		});
		expect(locked.status).toBe(204);

		expect([401, 403]).toContain((await read()).status);
	});

	test("the account route answers for the key's owner, and only for personal keys", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const owner = await lucid.user({ permissions: [] });
		const personal = await createPersonalKey(owner.session, ["account:read"]);
		const system = await admin.request<{ data: { apiKey: string } }>({
			method: "POST",
			path: "/api/v1/integrations",
			body: { name: uniqueName("System key"), scopes: [READ_STORIES] },
		});
		expect(system.status).toBe(201);

		const asOwner = await callContent(lucid, personal, "account");
		const asSystem = await callContent(
			lucid,
			system.body.data.apiKey,
			"account",
		);

		expect(asOwner.status).toBe(200);
		expect(asOwner.body).toMatchObject({ data: { id: owner.id } });
		expect(asSystem.status).toBe(403);
	});
});
