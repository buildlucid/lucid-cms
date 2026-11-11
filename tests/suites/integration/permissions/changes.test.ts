import { describe, expect, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import { createDocument } from "#shared/documents";
import { createRole } from "#shared/permissions";

const READ_STORIES = `documents:${STORY_KEY}:read`;
const READ_PAGES = "documents:page:read";

/**
 * Access is cached for a short while to keep requests fast. Every change here clears it, so each
 * takes effect on the user's next request.
 */
describe("access changes", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	test("applies a role's new permissions on the next request", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, {
			fields: [{ key: "title", type: "text", value: "Watched" }],
		});
		const { session, roleId } = await lucid.user({
			permissions: [READ_STORIES],
		});
		const read = async () =>
			(
				await session.request({
					path: `/api/v1/documents/${STORY_KEY}/${id}/latest`,
				})
			).status;
		const setPermissions = async (permissions: string[]) => {
			const updated = await admin.request({
				method: "PATCH",
				path: `/api/v1/roles/${roleId}`,
				body: { permissions },
			});
			expect(updated.status).toBe(204);
		};

		expect(await read()).toBe(200);
		await setPermissions([]);
		expect(await read()).toBe(403);
		await setPermissions([READ_STORIES]);
		expect(await read()).toBe(200);
	});

	test("takes a role's permissions away when the role is removed from the user or deleted", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const removed = await lucid.user({ permissions: [READ_STORIES] });
		const deleted = await lucid.user({ permissions: [READ_STORIES] });
		const canList = async (session: typeof removed.session) =>
			(await session.request({ path: `/api/v1/documents/${STORY_KEY}/latest` }))
				.status;
		expect(await canList(removed.session)).toBe(200);
		expect(await canList(deleted.session)).toBe(200);

		const unassigned = await admin.request({
			method: "PATCH",
			path: `/api/v1/users/${removed.id}`,
			body: { roleIds: [] },
		});
		const roleDeleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/roles/${deleted.roleId}`,
		});
		expect(unassigned.status).toBe(204);
		expect(roleDeleted.status).toBe(204);

		expect(await canList(removed.session)).toBe(403);
		expect(await canList(deleted.session)).toBe(403);
	});

	test("gives a user with several roles every permission any of them holds", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const pagesRole = await createRole(admin, [READ_PAGES]);
		const { session } = await lucid.user({
			permissions: [READ_STORIES],
			roleIds: [pagesRole],
		});

		const statuses = await Promise.all(
			[STORY_KEY, "page", "settings"].map(
				async (key) =>
					(await session.request({ path: `/api/v1/documents/${key}/latest` }))
						.status,
			),
		);

		expect(statuses).toEqual([200, 200, 403]);
	});

	test("signs a deleted user out at once", async ({ lucid }) => {
		const admin = await lucid.admin();
		const { session, id } = await lucid.user({ permissions: [] });
		expect((await session.request({ path: "/api/v1/account" })).status).toBe(
			200,
		);

		const binned = await admin.request({
			method: "DELETE",
			path: `/api/v1/users/${id}`,
		});
		expect(binned.status).toBe(204);

		expect((await session.request({ path: "/api/v1/account" })).status).toBe(
			401,
		);
	});
});
