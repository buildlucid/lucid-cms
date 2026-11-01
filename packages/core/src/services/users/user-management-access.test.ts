import { afterAll, beforeAll, expect, test } from "vitest";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { Permissions } from "../../libs/permission/definitions.js";
import type { Permission } from "../../libs/permission/types.js";
import type { LucidAuth } from "../../types/hono.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import createRole from "../roles/create-single.js";
import deleteRole from "../roles/delete-single.js";
import updateRole from "../roles/update-single.js";
import deleteUser from "./delete-single.js";
import inviteUser from "./invite-single.js";
import revokeRefreshTokens from "./revoke-refresh-tokens.js";
import updateUser from "./update-single.js";

const testConfig = getTestConfig();
let context: ServiceContext;
afterAll(testConfig.destroy);

beforeAll(async () => {
	await testConfig.migrate();
	context = createServiceContext({
		config: await testConfig.getConfig(),
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
});

/** A user manager who can do everything with users and roles, but not media. */
const managerPermissions: Permission[] = [
	Permissions.UsersCreate,
	Permissions.UsersUpdate,
	Permissions.UsersDelete,
	Permissions.RolesCreate,
	Permissions.RolesUpdate,
	Permissions.RolesDelete,
];

let roleCount = 0;
const createRoleWith = async (permissions: Permission[]) => {
	roleCount += 1;
	const role = await context.db.kysely
		.insertInto("lucid_roles")
		.values({ name: `Role ${roleCount}` })
		.returning("id")
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_role_permissions")
		.values(permissions.map((permission) => ({ role_id: role.id, permission })))
		.execute();
	return role.id;
};

let userCount = 0;
const createUser = async (props?: {
	superAdmin?: boolean;
	roleIds?: number[];
}) => {
	userCount += 1;
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `user-${userCount}@test.local`,
			username: `user-${userCount}`,
			secret: "test",
			invitation_accepted: true,
			super_admin: props?.superAdmin ?? false,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	if (props?.roleIds?.length) {
		await context.db.kysely
			.insertInto("lucid_user_roles")
			.values(props.roleIds.map((role_id) => ({ user_id: user.id, role_id })))
			.execute();
	}
	return user.id;
};

const authFor = async (props?: {
	superAdmin?: boolean;
}): Promise<LucidAuth> => ({
	id: await createUser(props),
	username: "actor",
	email: "actor@test.local",
	superAdmin: props?.superAdmin ?? false,
	permissions: props?.superAdmin ? [] : managerPermissions,
	exp: 0,
	iat: 0,
	nonce: "test",
	authTime: Math.floor(Date.now() / 1000),
});

test("users can only give or remove roles whose permissions they have", async () => {
	const manager = await authFor();
	const managerRole = await createRoleWith(managerPermissions);
	const mediaRole = await createRoleWith([Permissions.MediaUpdate]);

	const inviteRes = await inviteUser(context, {
		email: "invited@test.local",
		username: "invited",
		roleIds: [mediaRole],
		auth: manager,
	});
	expect(inviteRes.error?.status).toBe(403);

	const target = await createUser({ roleIds: [mediaRole] });
	const removeRes = await updateUser(context, {
		userId: target,
		roleIds: [],
		auth: manager,
	});
	expect(removeRes.error?.status).toBe(403);

	const otherTarget = await createUser();
	const giveRes = await updateUser(context, {
		userId: otherTarget,
		roleIds: [mediaRole],
		auth: manager,
	});
	expect(giveRes.error?.status).toBe(403);

	//* roles the actor can't give can stay while others change
	const keepRes = await updateUser(context, {
		userId: target,
		roleIds: [mediaRole, managerRole],
		auth: manager,
	});
	expect(keepRes.error).toBeUndefined();
});

test("only super admins can manage super admins", async () => {
	const manager = await authFor();
	const superAdmin = await authFor({ superAdmin: true });
	const target = await createUser({ superAdmin: true });

	const lockRes = await updateUser(context, {
		userId: target,
		isLocked: true,
		auth: manager,
	});
	expect(lockRes.error?.status).toBe(403);

	const revokeRes = await revokeRefreshTokens(context, {
		userId: target,
		auth: manager,
	});
	expect(revokeRes.error?.status).toBe(403);

	const deleteRes = await deleteUser(context, {
		userId: target,
		auth: manager,
	});
	expect(deleteRes.error?.status).toBe(403);

	const superAdminRes = await updateUser(context, {
		userId: target,
		isLocked: true,
		auth: superAdmin,
	});
	expect(superAdminRes.error).toBeUndefined();
});

test("roles can only be created or changed with permissions the user has", async () => {
	const manager = await authFor();

	const createRes = await createRole(context, {
		name: "Media editors",
		permissions: [Permissions.MediaUpdate],
		auth: manager,
	});
	expect(createRes.error?.status).toBe(403);

	const managerRole = await createRoleWith([Permissions.UsersUpdate]);
	const widenRes = await updateRole(context, {
		id: managerRole,
		permissions: [Permissions.UsersUpdate, Permissions.MediaUpdate],
		auth: manager,
	});
	expect(widenRes.error?.status).toBe(403);

	const mediaRole = await createRoleWith([Permissions.MediaUpdate]);
	const renameRes = await updateRole(context, {
		id: mediaRole,
		name: "Renamed",
		auth: manager,
	});
	expect(renameRes.error?.status).toBe(403);

	const deleteRes = await deleteRole(context, { id: mediaRole, auth: manager });
	expect(deleteRes.error?.status).toBe(403);

	const narrowRes = await updateRole(context, {
		id: managerRole,
		permissions: [],
		auth: manager,
	});
	expect(narrowRes.error).toBeUndefined();
});
