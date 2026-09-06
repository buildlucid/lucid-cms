import formatter from "../../libs/formatters/index.js";
import {
	getValidPermissions,
	isCorePermission,
} from "../../libs/permission/registry.js";
import type { CorePermission } from "../../libs/permission/types.js";
import {
	RolePermissionsRepository,
	RolesRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { invalidateAuthCache } from "../auth/helpers/auth-cache.js";

type ManagedRoleDefinition = {
	key: string;
	name: string;
	description?: string;
	permissions: CorePermission[];
};

/**
 * Synchronizes managed roles and prunes removed core permissions. Custom grants stay saved while unavailable.
 */
const syncRoles: ServiceFn<[], undefined> = async (context) => {
	const Roles = new RolesRepository(context.db);
	const RolePermissions = new RolePermissionsRepository(context.db);

	const rolesRes = await Roles.selectMultiple({
		select: ["id", "key", "locked"],
		validation: {
			enabled: true,
		},
	});
	if (rolesRes.error) return rolesRes;

	const managedRoles: ManagedRoleDefinition[] = [];
	const managedRoleKeys = managedRoles.map((role) => role.key);
	const managedRoleIdsToDelete = rolesRes.data
		.filter(
			(role) =>
				formatter.formatBoolean(role.locked) &&
				role.key !== null &&
				!managedRoleKeys.includes(role.key),
		)
		.map((role) => role.id);

	if (managedRoleIdsToDelete.length > 0) {
		const deleteRolesRes = await Roles.deleteMultiple({
			where: [
				{
					key: "id",
					operator: "in",
					value: managedRoleIdsToDelete,
				},
			],
			returning: ["id"],
		});
		if (deleteRolesRes.error) return deleteRolesRes;
	}

	for (const managedRole of managedRoles) {
		const existingRole = rolesRes.data.find(
			(role) => role.key === managedRole.key,
		);

		const roleId = existingRole?.id;
		const upsertRoleRes =
			roleId === undefined
				? await Roles.createSingle({
						data: {
							key: managedRole.key,
							locked: true,
							name: managedRole.name,
							description: managedRole.description ?? null,
						},
						returning: ["id"],
						validation: {
							enabled: true,
						},
					})
				: await Roles.updateSingle({
						data: {
							locked: true,
							name: managedRole.name,
							description: managedRole.description ?? null,
							updated_at: new Date().toISOString(),
						},
						where: [
							{
								key: "id",
								operator: "=",
								value: roleId,
							},
						],
						returning: ["id"],
						validation: {
							enabled: true,
						},
					});
		if (upsertRoleRes.error) return upsertRoleRes;

		const syncedRoleId = upsertRoleRes.data.id;
		const deletePermissionsRes = await RolePermissions.deleteMultiple({
			where: [
				{
					key: "role_id",
					operator: "=",
					value: syncedRoleId,
				},
			],
			returning: ["id"],
		});
		if (deletePermissionsRes.error) return deletePermissionsRes;

		if (managedRole.permissions.length > 0) {
			const createPermissionsRes = await RolePermissions.createMultiple({
				data: managedRole.permissions.map((permission) => ({
					role_id: syncedRoleId,
					permission,
					core: isCorePermission(permission),
				})),
			});
			if (createPermissionsRes.error) return createPermissionsRes;
		}
	}

	const validPermissions = getValidPermissions(context.config);
	const prunePermissionsRes = await RolePermissions.deleteMultiple({
		where: [
			{
				key: "core",
				operator: "=",
				value: context.config.db.getDefault("boolean", "true"),
			},
			{
				key: "permission",
				operator: "not in",
				value: validPermissions,
			},
		],
		returning: ["id"],
	});
	if (prunePermissionsRes.error) return prunePermissionsRes;

	await invalidateAuthCache(context);

	return {
		error: undefined,
		data: undefined,
	};
};

export default syncRoles;
