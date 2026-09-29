/** Permissions a principal holds. Super admins hold every permission. */
export type PermissionGrant = {
	superAdmin: boolean;
	permissions: readonly string[];
};

/** Whether a principal, such as a resolved user or an agent run's authority, holds a permission. */
const hasPermission = (grant: PermissionGrant, permission: string) =>
	grant.superAdmin || grant.permissions.includes(permission);

export default hasPermission;
