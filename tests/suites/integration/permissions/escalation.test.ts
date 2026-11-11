import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { uniqueName } from "#shared/permissions";

/** Permissions the managers in these tests hold, besides managing users or roles. */
const HELD = ["media:read", "media:create"];
/** A permission none of the managers hold. */
const NOT_HELD = "settings:update";

const createRole = (session: Session, permissions: string[]) =>
	session.request<{ data: { id: number } }>({
		method: "POST",
		path: "/api/v1/roles",
		body: { name: uniqueName("Role"), permissions },
	});

const readRolePermissions = async (admin: Session, roleId: number) => {
	const role = await admin.request<{
		data: { permissions?: Array<{ permission: string }> };
	}>({ path: `/api/v1/roles/${roleId}` });
	expect(role.status).toBe(200);
	return (role.body.data.permissions ?? []).map((item) => item.permission);
};

const readUser = async (admin: Session, userId: number) => {
	const user = await admin.request<{
		data: {
			superAdmin: boolean;
			isLocked: boolean;
			isDeleted: boolean;
			roles?: Array<{ id: number }>;
		};
	}>({ path: `/api/v1/users/${userId}` });
	expect(user.status).toBe(200);
	return user.body.data;
};

/** The seeded super admin's user ID. */
const adminId = async (admin: Session) => {
	const account = await admin.request<{ data: { id: number } }>({
		path: "/api/v1/account",
	});
	return account.body.data.id;
};

describe("giving away more than you hold", () => {
	requires("harness:outbox");

	test("a role manager can only create roles with permissions they hold", async ({
		lucid,
	}) => {
		const { session } = await lucid.user({
			permissions: ["roles:create", ...HELD],
		});

		expect((await createRole(session, [NOT_HELD])).status).toBe(403);
		expect((await createRole(session, [...HELD, NOT_HELD])).status).toBe(403);
		expect((await createRole(session, HELD)).status).toBe(201);
	});

	test("a role manager can't add permissions they lack to any role, their own included", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const manager = await lucid.user({
			permissions: ["roles:update", ...HELD],
		});
		const created = await createRole(admin, HELD);
		const otherRole = created.body.data.id;

		for (const roleId of [otherRole, manager.roleId]) {
			const updated = await manager.session.request({
				method: "PATCH",
				path: `/api/v1/roles/${roleId}`,
				body: { permissions: [...HELD, NOT_HELD] },
			});
			expect(updated.status, `role ${roleId}`).toBe(403);
		}

		expect(await readRolePermissions(admin, otherRole)).not.toContain(NOT_HELD);
		expect(await readRolePermissions(admin, manager.roleId ?? 0)).not.toContain(
			NOT_HELD,
		);
	});

	test("a role manager can't edit or delete a role that holds more than they do", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const manager = await lucid.user({
			permissions: ["roles:update", "roles:delete", ...HELD],
		});
		const created = await createRole(admin, [...HELD, NOT_HELD]);
		const roleId = created.body.data.id;

		const narrowed = await manager.session.request({
			method: "PATCH",
			path: `/api/v1/roles/${roleId}`,
			//* even removing what they lack is refused, as it changes access they can't give
			body: { permissions: HELD },
		});
		const deleted = await manager.session.request({
			method: "DELETE",
			path: `/api/v1/roles/${roleId}`,
		});

		expect(narrowed.status).toBe(403);
		expect(deleted.status).toBe(403);
		expect(await readRolePermissions(admin, roleId)).toContain(NOT_HELD);
	});

	test("a user manager can't give themselves or others a role beyond their own", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const manager = await lucid.user({
			permissions: ["users:update", "users:read", ...HELD],
		});
		const other = await lucid.user({ permissions: [] });
		const created = await createRole(admin, [NOT_HELD]);
		const strongRole = created.body.data.id;
		const giveStrongRole = (target: typeof manager) =>
			manager.session.request({
				method: "PATCH",
				path: `/api/v1/users/${target.id}`,
				body: { roleIds: [target.roleId, strongRole] },
			});

		//* people can't change their own user this way, which is refused before any role check
		expect((await giveStrongRole(manager)).status).toBe(400);
		expect((await giveStrongRole(other)).status).toBe(403);
		for (const target of [manager, other]) {
			expect(
				(await readUser(admin, target.id)).roles?.map((role) => role.id),
			).not.toContain(strongRole);
		}
	});

	test("a user manager's request to make someone a super admin changes nothing", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const manager = await lucid.user({
			permissions: ["users:update", "users:read"],
		});
		const other = await lucid.user({ permissions: [] });

		for (const target of [manager, other]) {
			await manager.session.request({
				method: "PATCH",
				path: `/api/v1/users/${target.id}`,
				body: { superAdmin: true },
			});
			expect((await readUser(admin, target.id)).superAdmin).toBe(false);
		}
	});

	test("an inviter can only invite with roles they could hold, and never a super admin", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const inviter = await lucid.user({
			permissions: ["users:create", ...HELD],
		});
		const strong = await createRole(admin, [NOT_HELD]);
		const fair = await createRole(admin, HELD);
		/** Invites a new user, and returns the response and their username. */
		const invite = async (body: {
			roleIds: number[];
			superAdmin?: boolean;
		}) => {
			const username = uniqueName("invitee").replace(" ", "");
			const response = await inviter.session.request({
				method: "POST",
				path: "/api/v1/users",
				body: { email: `${username}@harness.test`, username, ...body },
			});
			return { status: response.status, username };
		};
		const isSuperAdmin = async (username: string) => {
			const found = await admin.request<{
				data: Array<{ superAdmin: boolean }>;
			}>({ path: "/api/v1/users", query: { "filter[username]": username } });
			expect(found.body.data).toHaveLength(1);
			return found.body.data[0]?.superAdmin;
		};

		expect((await invite({ roleIds: [strong.body.data.id] })).status).toBe(403);
		expect((await invite({ roleIds: [fair.body.data.id] })).status).toBe(204);
		//* the flag is ignored for inviters who aren't super admins themselves
		const asSuperAdmin = await invite({ roleIds: [], superAdmin: true });
		expect(asSuperAdmin.status).toBe(204);
		expect(await isSuperAdmin(asSuperAdmin.username)).toBe(false);
	});

	test("someone who manages users can't lock, delete or sign out a super admin", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const superAdmin = await adminId(admin);
		const { session } = await lucid.user({
			permissions: ["users:read", "users:update", "users:delete"],
		});

		const attempts = {
			lock: await session.request({
				method: "PATCH",
				path: `/api/v1/users/${superAdmin}`,
				body: { isLocked: true },
			}),
			removeSuperAdmin: await session.request({
				method: "PATCH",
				path: `/api/v1/users/${superAdmin}`,
				body: { superAdmin: false },
			}),
			revokeSessions: await session.request({
				method: "POST",
				path: `/api/v1/users/${superAdmin}/revoke-refresh-tokens`,
			}),
			bin: await session.request({
				method: "DELETE",
				path: `/api/v1/users/${superAdmin}`,
			}),
			deletePermanently: await session.request({
				method: "DELETE",
				path: `/api/v1/users/${superAdmin}/permanent`,
			}),
		};

		expect(
			Object.fromEntries(
				Object.entries(attempts).map(([name, response]) => [
					name,
					response.status,
				]),
			),
		).toEqual({
			lock: 403,
			removeSuperAdmin: 403,
			revokeSessions: 403,
			bin: 403,
			deletePermanently: 403,
		});
		expect(await readUser(admin, superAdmin)).toMatchObject({
			superAdmin: true,
			isLocked: false,
			isDeleted: false,
		});
		//* the admin is still signed in
		expect((await admin.request({ path: "/api/v1/account" })).status).toBe(200);
	});

	test("the same manager can lock and unlock an ordinary user", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const { session } = await lucid.user({
			permissions: ["users:read", "users:update"],
		});
		const target = await lucid.user({ permissions: [] });

		const locked = await session.request({
			method: "PATCH",
			path: `/api/v1/users/${target.id}`,
			body: { isLocked: true },
		});

		expect(locked.status).toBe(204);
		expect((await readUser(admin, target.id)).isLocked).toBe(true);
		//* a locked user is refused at once
		expect(
			(await target.session.request({ path: "/api/v1/account" })).status,
		).toBe(401);
	});
});
