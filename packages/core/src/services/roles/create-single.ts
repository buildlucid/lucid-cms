import {
	RolePermissionsRepository,
	RolesRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { roleServices } from "../index.js";

const createSingle: ServiceFn<
	[
		{
			name: string;
			description?: string;
			permissions: string[];
		},
	],
	number
> = async (context, data) => {
	const Roles = new RolesRepository(context.db, context.config.db);

	const [validatePermsRes, checkNameIsUniqueRes] = await Promise.all([
		roleServices.validatePermissions(context, {
			permissions: data.permissions,
		}),
		Roles.selectSingle({
			select: ["id"],
			where: [
				{
					key: "name",
					operator: "=",
					value: data.name,
				},
			],
		}),
	]);
	if (validatePermsRes.error) return validatePermsRes;
	if (checkNameIsUniqueRes.error) return checkNameIsUniqueRes;

	if (checkNameIsUniqueRes.data !== undefined) {
		return {
			error: {
				type: "basic",
				message: T("not_unique_error_message"),
				status: 400,
				errors: {
					name: {
						code: "invalid",
						message: T("not_unique_error_message"),
					},
				},
			},
			data: undefined,
		};
	}

	const newRolesRes = await Roles.createSingle({
		data: {
			name: data.name,
			description: data.description,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (newRolesRes.error) return newRolesRes;

	if (validatePermsRes.data.length > 0) {
		const RolePermissions = new RolePermissionsRepository(
			context.db,
			context.config.db,
		);
		const rolePermsRes = await RolePermissions.createMultiple({
			data: validatePermsRes.data.map((p) => ({
				role_id: newRolesRes.data.id,
				permission: p.permission,
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
