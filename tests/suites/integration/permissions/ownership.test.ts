import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { uploadMedia } from "#shared/helpers/media";
import { uniqueName } from "#shared/helpers/permissions";

const UPLOADER = ["media:create", "media:update"];

/**
 * The IDs of media a session can list, out of those given. The list shows library media unless
 * `ownership` asks for personal (`user`) media instead.
 */
const listedOf = async (
	session: Session,
	ids: number[],
	ownership?: "user",
) => {
	const listed = await session.request<{ data: Array<{ id: number }> }>({
		path: "/api/v1/media",
		query: {
			"filter[id]": ids.join(","),
			...(ownership && { "filter[ownership]": ownership }),
			perPage: 100,
		},
	});
	expect(listed.status).toBe(200);
	return listed.body.data.map((media) => media.id).toSorted((a, b) => a - b);
};

const getStatus = async (session: Session, id: number) =>
	(await session.request({ path: `/api/v1/media/${id}` })).status;

describe("media ownership", () => {
	requires("harness:outbox", "feature:mediaStorage");

	test("library media needs media:read to browse", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Library file" });
		const without = await lucid.user({ permissions: [] });
		const reader = await lucid.user({ permissions: ["media:read"] });

		expect(await listedOf(without.session, [id])).toEqual([]);
		expect(await getStatus(without.session, id)).toBe(404);
		expect(await listedOf(reader.session, [id])).toEqual([id]);
		expect(await getStatus(reader.session, id)).toBe(200);
	});

	test("personal media is only seen by its owner and people who can read all media", async ({
		lucid,
	}) => {
		const owner = await lucid.user({ permissions: UPLOADER });
		const id = await uploadMedia(owner.session, {
			title: "Personal file",
			owned: true,
		});
		const libraryReader = await lucid.user({ permissions: ["media:read"] });
		const readsAll = await lucid.user({ permissions: ["media:read-all"] });

		//* the owner has no media:read, and still sees their own
		expect(await listedOf(owner.session, [id], "user")).toEqual([id]);
		expect(await getStatus(owner.session, id)).toBe(200);
		expect(await listedOf(libraryReader.session, [id], "user")).toEqual([]);
		expect(await getStatus(libraryReader.session, id)).toBe(404);
		expect(await listedOf(readsAll.session, [id], "user")).toEqual([id]);
		expect(await getStatus(readsAll.session, id)).toBe(200);
	});

	test("reading all media never allows changing someone's personal media", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const owner = await lucid.user({ permissions: UPLOADER });
		const id = await uploadMedia(owner.session, {
			title: "Not yours",
			owned: true,
		});
		const other = await lucid.user({
			permissions: ["media:read-all", "media:update"],
		});

		const updated = await other.session.request({
			method: "PATCH",
			path: `/api/v1/media/${id}`,
			body: { title: [{ localeCode: null, value: "Changed" }] },
		});

		expect(updated.status).toBeGreaterThanOrEqual(400);
		const stored = await admin.request({ path: `/api/v1/media/${id}` });
		//* a title is text, or text by locale on setups with locales
		expect(JSON.stringify(stored.body)).toContain("Not yours");
		expect(JSON.stringify(stored.body)).not.toContain("Changed");
	});

	test("someone else's personal media can't be added to the library without reading it", async ({
		lucid,
	}) => {
		const owner = await lucid.user({ permissions: UPLOADER });
		const id = await uploadMedia(owner.session, {
			title: "Staying personal",
			owned: true,
		});
		const other = await lucid.user({
			permissions: ["media:read", "media:create"],
		});

		const added = await other.session.request({
			method: "POST",
			path: `/api/v1/media/${id}/add-to-library`,
		});

		expect(added.status).toBeGreaterThanOrEqual(400);
		expect(await listedOf(other.session, [id])).toEqual([]);
		expect(await listedOf(owner.session, [id], "user")).toEqual([id]);
	});
});

describe("other users' API keys", () => {
	requires("harness:outbox");

	/** Makes a key for a user as a session, returning the status and, when made, the key's ID. */
	const createKey = async (session: Session, userId: number) => {
		const name = uniqueName("Personal key");
		const created = await session.request({
			method: "POST",
			path: `/api/v1/users/${userId}/integrations`,
			body: { name, scopes: [] },
		});
		if (created.status !== 200) {
			return { status: created.status, id: null };
		}
		//* the response only holds the key, so the ID comes from the user's list
		const listed = await session.request<{
			data: Array<{ id: number; name: string }>;
		}>({ path: `/api/v1/users/${userId}/integrations` });
		const id = listed.body.data.find((key) => key.name === name)?.id ?? null;
		return { status: created.status, id };
	};

	test("anyone can manage their own keys without any permission", async ({
		lucid,
	}) => {
		const { session, id } = await lucid.user({ permissions: [] });

		const created = await createKey(session, id);
		expect(created.status).toBe(200);
		const keyId = created.id;
		const base = `/api/v1/users/${id}/integrations`;

		expect((await session.request({ path: base })).status).toBe(200);
		expect(
			(
				await session.request({
					method: "POST",
					path: `${base}/${keyId}/regenerate-keys`,
				})
			).status,
		).toBe(200);
	});

	test("nobody but a super admin makes or regenerates keys for someone else", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const target = await lucid.user({ permissions: [] });
		const created = await createKey(admin, target.id);
		expect(created.status).toBe(200);
		const keyId = created.id;
		const manager = await lucid.user({
			permissions: ["users:read", "users:update"],
		});

		const madeForThem = await createKey(manager.session, target.id);
		const regenerated = await manager.session.request({
			method: "POST",
			path: `/api/v1/users/${target.id}/integrations/${keyId}/regenerate-keys`,
		});

		expect(madeForThem.status).toBe(403);
		expect(regenerated.status).toBe(403);
	});

	test("a user manager can't change or delete a super admin's keys", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const account = await admin.request<{ data: { id: number } }>({
			path: "/api/v1/account",
		});
		const adminId = account.body.data.id;
		const created = await createKey(admin, adminId);
		expect(created.status).toBe(200);
		const path = `/api/v1/users/${adminId}/integrations/${created.id}`;
		const manager = await lucid.user({
			permissions: ["users:read", "users:update"],
		});

		const updated = await manager.session.request({
			method: "PATCH",
			path,
			body: { enabled: false },
		});
		const deleted = await manager.session.request({ method: "DELETE", path });

		expect(updated.status).toBe(403);
		expect(deleted.status).toBe(403);
		expect((await admin.request({ path })).status).toBe(200);
	});

	test("someone with neither users:read nor users:update can't see another user's keys", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const target = await lucid.user({ permissions: [] });
		const created = await createKey(admin, target.id);
		const other = await lucid.user({ permissions: [] });
		const base = `/api/v1/users/${target.id}/integrations`;

		expect((await other.session.request({ path: base })).status).toBe(403);
		expect(
			(
				await other.session.request({
					path: `${base}/${created.id}`,
				})
			).status,
		).toBe(403);
	});
});

describe("the user directory", () => {
	requires("harness:outbox");

	/** Each listed user's email by username, as a session sees them. */
	const emailsSeenBy = async (session: Session, usernames: string[]) => {
		const listed = await session.request<{
			data: Array<{ username: string; email?: string }>;
		}>({ path: "/api/v1/users", query: { perPage: 100 } });
		expect(listed.status).toBe(200);
		return Object.fromEntries(
			listed.body.data
				.filter((user) => usernames.includes(user.username))
				.map((user) => [user.username, user.email ?? null]),
		);
	};

	test("lists everyone but shows emails only with users:read, or your own", async ({
		lucid,
	}) => {
		const viewer = await lucid.user({ permissions: [] });
		const other = await lucid.user({ permissions: [] });
		const reader = await lucid.user({ permissions: ["users:read"] });
		const names = [viewer.credentials.username, other.credentials.username];

		expect(await emailsSeenBy(viewer.session, names)).toEqual({
			[viewer.credentials.username]: viewer.credentials.email,
			[other.credentials.username]: null,
		});
		expect(await emailsSeenBy(reader.session, names)).toEqual({
			[viewer.credentials.username]: viewer.credentials.email,
			[other.credentials.username]: other.credentials.email,
		});
	});

	test("ignores email filters without users:read, so they can't confirm whose an address is", async ({
		lucid,
	}) => {
		const viewer = await lucid.user({ permissions: [] });
		const other = await lucid.user({ permissions: [] });

		const filtered = await viewer.session.request<{
			data: Array<{ username: string }>;
		}>({
			path: "/api/v1/users",
			query: { "filter[email]": other.credentials.email, perPage: 100 },
		});

		expect(filtered.status).toBe(200);
		//* had the filter applied, only the other user would be listed
		expect(filtered.body.data.map((user) => user.username)).toContain(
			viewer.credentials.username,
		);
	});
});
