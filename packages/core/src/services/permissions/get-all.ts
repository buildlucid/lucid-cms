import collections from "../../libs/collection/collections.js";
import { permissionsFormatter } from "../../libs/formatters/index.js";
import { getGrantablePermissionRegistry } from "../../libs/permission/registry.js";
import type { PermissionGroup } from "../../libs/permission/types.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getAll: ServiceFn<[], PermissionGroup[]> = async (context) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const formattedPermissions = permissionsFormatter.formatMultiple({
		permissions: getGrantablePermissionRegistry(collectionsRes.data),
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
