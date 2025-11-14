import type { LucidAuth, Permission } from "../../types.js";

/**
 * Checks if the user has the access based on permissions and resource ownership.
 */
const hasAccess = (params: {
	/** The user to check the access for, if not provided, the access will be denied */
	user?: LucidAuth;
	/** The permissions that must all be present */
	requiredPermissions?: Permission[];
	/** The permissions where at least one must be present */
	optionalPermissions?: Permission[];
	/** If provided, users can access their own resources regardless of permissions */
	resourceOwnerId?: number;
}): boolean => {
	if (!params.user) return false;
	if (params.user?.superAdmin) return true;
	if (params.resourceOwnerId && params.user?.id === params.resourceOwnerId)
		return true;
	if (params.user?.permissions === undefined) return false;

	const requiredPermissions = params.requiredPermissions ?? [];
	const optionalPermissions = params.optionalPermissions ?? [];

	const hasAllRequired = requiredPermissions.every((p) =>
		params.user?.permissions?.includes(p),
	);
	if (!hasAllRequired) return false;

	if (optionalPermissions.length === 0) return hasAllRequired;

	return optionalPermissions.some((p) => params.user?.permissions?.includes(p));
};

export default hasAccess;
