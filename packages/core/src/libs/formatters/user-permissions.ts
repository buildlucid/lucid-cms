import type { Permission } from "../../exports/types.js";
import type { UserPermission } from "../../types/response.js";

interface UserPermissionRolesPropsT {
	id: number;
	name: string;
	permissions?: {
		permission: string;
	}[];
}

const formatMultiple = (props: {
	roles: UserPermissionRolesPropsT[];
}): UserPermission => {
	if (!props.roles) {
		return {
			roles: [],
			permissions: [],
		};
	}

	const permissionsSet: Set<Permission> = new Set();

	for (const role of props.roles) {
		if (!role.permissions) continue;
		for (const permission of role.permissions) {
			permissionsSet.add(permission.permission as Permission);
		}
	}

	return {
		roles: props.roles.map(({ id, name }) => ({ id, name })),
		permissions: Array.from(permissionsSet),
	};
};

export default {
	formatMultiple,
};
