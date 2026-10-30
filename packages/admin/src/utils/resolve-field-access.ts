import type { FieldPermissionKeys } from "@types";
import userStore from "@/store/userStore/userStore";

/** What the current user can do with a field, tab, section, collapsible or brick. */
export type FieldAccess = "editable" | "locked" | "hidden";

const rank: Record<FieldAccess, number> = { hidden: 0, locked: 1, editable: 2 };

/** Resolves field access within its parent's limits, matching server rules that hide unreadable content and preserve locked values on save. */
const resolveFieldAccess = (
	permissions: FieldPermissionKeys | undefined,
	parent: FieldAccess = "editable",
): FieldAccess => {
	const own: FieldAccess =
		permissions?.read !== undefined &&
		!userStore.get.meetsRequirement(permissions.read)
			? "hidden"
			: permissions?.update !== undefined &&
					!userStore.get.meetsRequirement(permissions.update)
				? "locked"
				: "editable";

	return rank[own] < rank[parent] ? own : parent;
};

export default resolveFieldAccess;
