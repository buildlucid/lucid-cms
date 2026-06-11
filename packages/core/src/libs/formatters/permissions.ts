import { hydrateAdminCopyDefaults } from "../i18n/hydrate-admin-copy-defaults.js";
import type { PermissionGroup } from "../permission/types.js";

const formatMultiple = (props: {
	permissions: PermissionGroup[] | Record<string, PermissionGroup>;
	adminTranslations?: Record<string, string>;
}): PermissionGroup[] => {
	const permissions = Array.isArray(props.permissions)
		? props.permissions
		: Object.values(props.permissions);

	return hydrateAdminCopyDefaults(permissions, props.adminTranslations);
};

export default {
	formatMultiple,
};
