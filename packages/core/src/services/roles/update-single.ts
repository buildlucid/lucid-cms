import {
	RolePermissionsRepository,
	RolesRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { roleServices } from "../index.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			name?: string;
			description?: string;
			permissions?: string[];
		},
	],
	undefined
> = async (context, data) => {
	const Roles = new RolesRepository(context.db, context.config.db);

	const [validatePermsRes, checkNameIsUniqueRes] = await Promise.all([
		data.permissions !== undefined
			? roleServices.validatePermissions(context, {
					permissions: data.permissions,
				})
			: undefined,
		data.name !== undefined
			? Roles.selectSingle({
					select: ["id"],
					where: [
						{
							key: "name",
							operator: "=",
							value: data.name,
						},
						{
							key: "id",
							operator: "!=",
							value: data.id,
						},
					],
				})
			: undefined,
	]);
	if (checkNameIsUniqueRes?.error) return checkNameIsUniqueRes;
	if (validatePermsRes?.error) return validatePermsRes;

	if (data.name !== undefined && checkNameIsUniqueRes?.data !== undefined) {
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
	const updateRoleRes = await Roles.updateSingle({
		data: {
			name: data.name,
			description: data.description,
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
		const RolePermissions = new RolePermissionsRepository(
			context.db,
			context.config.db,
		);

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
				})),
			});
			if (rolePermsRes.error) return rolePermsRes;
		}
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateSingle;
