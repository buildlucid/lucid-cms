import type { Permission } from "@types";
import { useSession } from "../useSession/useSession";

/**
 * Checks the current user's permissions. Use it to adjust the interface, as
 * the API still enforces access.
 *
 * @example
 * ```tsx
 * import { Button } from "@lucidcms/admin/components";
 * import { Permissions, usePermissions, useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 * const permissions = usePermissions();
 *
 * return (
 * 	<Show when={permissions.can(Permissions.MediaCreate)}>
 * 		<Button onClick={openUpload}>{t("common.upload")}</Button>
 * 	</Show>
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
