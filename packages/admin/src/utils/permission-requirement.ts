import type { Permission } from "@types";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

/** Permission keys the user needs, or a boolean when access is checked elsewhere. */
export type PermissionRequirement = Permission | Permission[] | boolean;

/**
 * Checks a `permission` prop against the current user. Undefined means no
 * permission is required.
 */
export const checkPermission = (
	requirement: PermissionRequirement | undefined,
): { permitted: boolean; missing: Permission[] } => {
	if (requirement === undefined) return { permitted: true, missing: [] };
	if (typeof requirement === "boolean") {
		return { permitted: requirement, missing: [] };
	}

	const required = Array.isArray(requirement) ? requirement : [requirement];
	const missing = required.filter(
		(permission) => !userStore.get.hasPermission([permission]).all,
	);
	return { permitted: missing.length === 0, missing };
};

/** Tells the user they cannot do something, naming the missing permissions when known. */
export const showNoPermissionToast = (missing: Permission[]) => {
	spawnToast({
		title: T()("toasts.common.no.permission.title"),
		message:
			missing.length > 0
				? T()("toasts.common.no.permission.message.detailed", {
						permission: missing.join(", "),
					})
				: T()("toasts.common.no.permission.message"),
		status: "warning",
	});
};
