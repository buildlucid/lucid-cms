import type { LucidAuth, Permission } from "../../types.js";

/**
 * Checks if the user has the access based on permissions and resource ownership.
 */
const hasAccess = (params: {
	/** The user to check the access for, if not provided, the access will be denied */
	user?: LucidAuth;
	/** The permissions required to access the resource */
	requiredPermissions: Permission[];
	/** If provided, users can access their own resources regardless of permissions */
	resourceOwnerId?: number;
}): boolean => {
	if (!params.user) return false;
	if (params.user?.superAdmin) return true;
	if (params.resourceOwnerId && params.user?.id === params.resourceOwnerId)
		return true;
	if (params.user?.permissions === undefined) return false;
	return params.requiredPermissions.every((p) =>
		params.user?.permissions?.includes(p),
	);
};

export default hasAccess;
