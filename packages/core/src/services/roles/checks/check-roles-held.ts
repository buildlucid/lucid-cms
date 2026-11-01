import { RolePermissionsRepository } from "../../../libs/repositories/index.js";
import type { LucidAuth } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkPermissionsHeld from "./check-permissions-held.js";

/** Refuses giving or removing roles with permissions the actor doesn't hold. */
const checkRolesHeld: ServiceFn<
	[
		{
			auth: Pick<LucidAuth, "superAdmin" | "permissions">;
			roleIds: number[];
		},
	],
	undefined
> = async (context, data) => {
	if (data.auth.superAdmin || data.roleIds.length === 0) {
		return { error: undefined, data: undefined };
	}

	const RolePermissions = new RolePermissionsRepository(context.db);
	const permissionsRes = await RolePermissions.selectMultiple({
		select: ["permission"],
		where: [{ key: "role_id", operator: "in", value: data.roleIds }],
		validation: { enabled: true },
	});
	if (permissionsRes.error) return permissionsRes;

	return checkPermissionsHeld(context, {
		auth: data.auth,
		permissions: permissionsRes.data.map((row) => row.permission),
	});
};

export default checkRolesHeld;
