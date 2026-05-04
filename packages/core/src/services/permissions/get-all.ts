import { permissionsFormatter } from "../../libs/formatters/index.js";
import { getPermissionRegistry } from "../../libs/permission/registry.js";
import type { PermissionGroup } from "../../libs/permission/types.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getAll: ServiceFn<[], PermissionGroup[]> = async (context) => {
	const formattedPermissions = permissionsFormatter.formatMultiple({
		permissions: getPermissionRegistry(context.config),
	});

	return {
		error: undefined,
		data: formattedPermissions,
	};
};

export default getAll;
