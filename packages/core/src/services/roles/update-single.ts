import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

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
	const RolesRepo = Repository.get("roles", context.db, context.config.db);

	const [validatePermsRes, checkNameIsUnique] = await Promise.all([
		data.permissions !== undefined
			? context.services.role.validatePermissions(context, {
					permissions: data.permissions,
				})
			: undefined,
		data.name !== undefined
			? RolesRepo.selectSingle({
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
	if (validatePermsRes?.error) return validatePermsRes;

	if (data.name !== undefined && checkNameIsUnique !== undefined) {
		return {
			error: {
				type: "basic",
				message: T("not_unique_error_message"),
				status: 400,
				errorResponse: {
					body: {
						name: {
							code: "invalid",
							message: T("not_unique_error_message"),
						},
					},
				},
			},
			data: undefined,
		};
	}
	const updateRoleRes = await RolesRepo.updateSingle({
		data: {
			name: data.name,
			description: data.description,
			updatedAt: new Date().toISOString(),
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
	});

	if (updateRoleRes === undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
			},
			data: undefined,
		};
	}

	if (validatePermsRes?.data !== undefined) {
		const RolePermissions = Repository.get(
			"role-permissions",
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
