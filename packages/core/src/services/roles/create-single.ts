import { copy } from "../../libs/i18n/index.js";
import { isCorePermission } from "../../libs/permission/registry.js";
import {
	RolePermissionsRepository,
	RolesRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import validatePermissions from "./validate-permissions.js";

const createSingle: ServiceFn<
	[
		{
			name: string;
			description?: string | null;
			permissions: string[];
		},
	],
	number
> = async (context, data) => {
	const Roles = new RolesRepository(context.db);
	const [validatePermsRes, checkNameIsUniqueRes] = await Promise.all([
		validatePermissions(context, {
			permissions: data.permissions,
		}),
		Roles.selectRoleIdByName({
			name: data.name,
		}),
	]);
	if (validatePermsRes.error) return validatePermsRes;
	if (checkNameIsUniqueRes.error) return checkNameIsUniqueRes;

	if (checkNameIsUniqueRes.data !== undefined) {
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

	const newRolesRes = await Roles.createSingle({
		data: { name: data.name, description: data.description ?? null },
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (newRolesRes.error) return newRolesRes;

	if (validatePermsRes.data.length > 0) {
		const RolePermissions = new RolePermissionsRepository(context.db);
		const rolePermsRes = await RolePermissions.createMultiple({
			data: validatePermsRes.data.map((p) => ({
				role_id: newRolesRes.data.id,
				permission: p.permission,
				core: isCorePermission(p.permission),
			})),
		});
		if (rolePermsRes.error) return rolePermsRes;
	}

	return {
		error: undefined,
		data: newRolesRes.data.id,
	};
};

export default createSingle;
