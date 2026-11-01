import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { isCorePermission } from "../../libs/permission/registry.js";
import {
	RolePermissionsRepository,
	RolesRepository,
} from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { invalidateAuthCache } from "../auth/helpers/auth-cache.js";
import checkPermissionsHeld from "./checks/check-permissions-held.js";
import checkRoleAccess from "./checks/check-role-access.js";
import validatePermissions from "./validate-permissions.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			name?: string;
			description?: string | null;
			requireTwoFactor?: boolean;
			permissions?: string[];
			auth: Pick<LucidAuth, "superAdmin" | "permissions">;
		},
	],
	undefined
> = async (context, data) => {
	const Roles = new RolesRepository(context.db);
	const roleRes = await checkRoleAccess(context, { id: data.id });
	if (roleRes.error) return roleRes;

	const existingPermissions = (roleRes.data.permissions ?? []).map(
		(entry) => entry.permission,
	);
	//* editing any part of a role needs its current and new permissions
	const heldRes = checkPermissionsHeld(context, {
		auth: data.auth,
		permissions: [...existingPermissions, ...(data.permissions ?? [])],
	});
	if (heldRes.error) return heldRes;

	const validatePermsRes =
		data.permissions === undefined
			? undefined
			: await validatePermissions(context, {
					permissions: data.permissions,
					existingPermissions,
				});
	if (validatePermsRes?.error) return validatePermsRes;

	if (formatter.formatBoolean(roleRes.data.locked)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.permissions.denied"),
				status: 403,
			},
			data: undefined,
		};
	}

	const checkNameIsUniqueRes =
		data.name != null
			? await Roles.selectRoleIdByName({
					name: data.name,
					excludeRoleId: data.id,
				})
			: undefined;
	if (checkNameIsUniqueRes?.error) return checkNameIsUniqueRes;

	if (data.name != null && checkNameIsUniqueRes?.data !== undefined) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.validation.unique.message"),
				status: 400,
				errors: {
					name: {
						code: "invalid",
						message: copy("server:core.validation.unique.message"),
					},
				},
			},
			data: undefined,
		};
	}
	const updateRoleRes = await Roles.updateSingle({
		data: {
			name: data.name,
			description: data.description,
			require_two_factor: data.requireTwoFactor,
			updated_at: new Date().toISOString(),
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (updateRoleRes.error) return updateRoleRes;

	if (validatePermsRes?.data !== undefined) {
		const RolePermissions = new RolePermissionsRepository(context.db);

		const deletePermsRes = await RolePermissions.deleteMultiple({
			where: [
				{
					key: "role_id",
					operator: "=",
					value: data.id,
				},
			],
			returning: ["id"],
			validation: {
				enabled: true,
			},
		});
		if (deletePermsRes.error) return deletePermsRes;

		if (validatePermsRes.data.length > 0) {
			const rolePermsRes = await RolePermissions.createMultiple({
				data: validatePermsRes.data.map((p) => ({
					role_id: data.id,
					permission: p.permission,
					core: isCorePermission(p.permission),
				})),
			});
			if (rolePermsRes.error) return rolePermsRes;
		}
	}

	await invalidateAuthCache(context);

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateSingle;
