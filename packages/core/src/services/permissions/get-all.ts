import { permissionsFormatter } from "../../libs/formatters/index.js";
import { PermissionGroups } from "../../libs/permission/definitions.js";
import type { Permission } from "../../types.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getAll: ServiceFn<[], Permission[]> = async () => {
	const formattedPermissions = permissionsFormatter.formatMultiple({
		permissions: PermissionGroups,
	});

	return {
		error: undefined,
		data: formattedPermissions.flatMap((group) => group.permissions),
	};
};

export default getAll;
