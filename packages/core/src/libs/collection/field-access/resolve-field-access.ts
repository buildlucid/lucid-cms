import type { GeneratedFieldPermissions } from "../../permission/types.js";
import type { FieldAccess, FieldAccessActor } from "./types.js";

const rank: Record<FieldAccess, number> = { hidden: 0, locked: 1, editable: 2 };

/** Returns the more restrictive of two access levels. */
export const narrowestAccess = (a: FieldAccess, b: FieldAccess): FieldAccess =>
	rank[a] <= rank[b] ? a : b;

/** Resolves a field's or brick's own generated permissions, ignoring surrounding restrictions and granting full access when the actor is omitted for trusted hooks or system writes. */
const resolveFieldAccess = (
	actor: FieldAccessActor | undefined,
	permissions: GeneratedFieldPermissions | undefined,
): FieldAccess => {
	if (!permissions || actor === undefined || actor.superAdmin) {
		return "editable";
	}

	const holds = (permission: string | undefined) =>
		permission === undefined ||
		actor.permissions?.includes(permission) === true;

	if (!holds(permissions.read)) return "hidden";
	if (!holds(permissions.update)) return "locked";
	return "editable";
};

export default resolveFieldAccess;
