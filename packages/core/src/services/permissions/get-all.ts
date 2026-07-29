import { permissionsFormatter } from "../../libs/formatters/index.js";
import { getGrantablePermissionRegistry } from "../../libs/permission/registry.js";
import type { PermissionGroup } from "../../libs/permission/types.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getAll: ServiceFn<[], PermissionGroup[]> = async (context) => {
	const formattedPermissions = permissionsFormatter.formatMultiple({
		permissions: getGrantablePermissionRegistry(context.config),
		adminTranslations: context.translate
			.forLocale(context.config.i18n.defaultLocale)
			.adminBundle(),
	});

	return {
		error: undefined,
		data: formattedPermissions,
	};
};

export default getAll;
