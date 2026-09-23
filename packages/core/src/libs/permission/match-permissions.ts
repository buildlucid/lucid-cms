import type { Permission, PermissionRequirement } from "./types.js";

type SomeRequirement = Extract<
	PermissionRequirement,
	{ readonly some: readonly unknown[] }
>;

// Arrays have a `some` method, so `"some" in value` alone can't tell them apart.
const isSomeRequirement = (
	requirement: PermissionRequirement,
): requirement is SomeRequirement =>
	typeof requirement === "object" && !Array.isArray(requirement);

/** Lists every permission key a requirement mentions. */
export const requirementPermissions = (
	requirement: PermissionRequirement,
): Permission[] => {
	if (typeof requirement === "string") return [requirement];
	if (isSomeRequirement(requirement)) return requirement.some.flat();
	return [...requirement];
};

/** Checks granted permissions against one key, all of a list, or `some` of several options. */
export const matchPermissions = (
	granted: readonly string[],
	requirement: PermissionRequirement,
): boolean => {
	if (typeof requirement === "string") return granted.includes(requirement);
	if (isSomeRequirement(requirement)) {
		return requirement.some.some((option) => matchPermissions(granted, option));
	}
	return requirement.every((permission) => granted.includes(permission));
};
