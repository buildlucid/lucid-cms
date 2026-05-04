import type { UserPermission } from "../../types/response.js";
import type { Permission } from "../../types.js";

interface UserPermissionRolesPropsT {
	id: number;
	name?: string | null;
	translations?: {
		name: string | null;
		locale_code: string | null;
	}[];
	permissions?: {
		permission: string;
	}[];
}

const formatMultiple = (props: {
	roles: UserPermissionRolesPropsT[];
	defaultLocale: string;
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
		roles: props.roles.map(({ id, name, translations }) => ({
			id,
			name:
				name ??
				translations?.find(
					(translation) => translation.locale_code === props.defaultLocale,
				)?.name ??
				translations?.find((translation) => translation.name !== null)?.name ??
				"",
		})),
		permissions: Array.from(permissionsSet),
	};
};

export default {
	formatMultiple,
};
