import type { Permission } from "@types";
import { useSession } from "../useSession/useSession";

/**
 * Checks the current user's permissions. API endpoints must still enforce access.
 *
 * @example
 * ```tsx
 * import { Permissions, usePermissions } from "@lucidcms/admin/hooks";
 *
 * const permissions = usePermissions();
 *
 * return (
 *   <button disabled={!permissions.can(Permissions.MediaCreate)}>
 *     Upload
 *   </button>
 * );
 * ```
 */
export const usePermissions = () => {
	const session = useSession();

	const can = (permission: Permission) => {
		const user = session.user();
		return (
			user?.superAdmin === true ||
			user?.permissions?.includes(permission) === true
		);
	};

	return {
		ready: () => session.status() !== "loading",
		can,
		all: (permissions: readonly Permission[]) =>
			permissions.length > 0 && permissions.every(can),
		any: (permissions: readonly Permission[]) => permissions.some(can),
	};
};
