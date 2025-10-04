import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import services from "../index.js";

const updateMultipleRoles: ServiceFn<
	[
		{
			userId: number;
			roleIds?: number[];
		},
	],
	undefined
> = async (context, data) => {
	if (data.roleIds === undefined) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const UserRoles = Repository.get("user-roles", context.db, context.config.db);

	const [roleExistsRes, deleteMultipleRes] = await Promise.all([
		services.user.checks.checkRolesExist(context, {
			roleIds: data.roleIds || [],
		}),
		UserRoles.deleteMultiple({
			where: [
				{
					key: "user_id",
					operator: "=",
					value: data.userId,
				},
			],
			returning: ["id"],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (roleExistsRes.error) return roleExistsRes;
	if (deleteMultipleRes.error) return deleteMultipleRes;

	if (data.roleIds.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const createMultipleRes = await UserRoles.createMultiple({
		data: data.roleIds.map((r) => ({
			user_id: data.userId,
			role_id: r,
		})),
	});
	if (createMultipleRes.error) return createMultipleRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateMultipleRoles;
