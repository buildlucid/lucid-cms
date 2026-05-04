import type { Config } from "../../types/config.js";
import { PermissionGroups, Permissions } from "./definitions.js";
import type {
	CorePermission,
	Permission,
	PermissionDefinition,
	PermissionGroup,
} from "./types.js";

/**
 * Builds the runtime permission catalogue exposed by `/permissions`.
 * Core permissions are always present, then config-defined permissions are
 * attached to either custom groups or existing core groups.
 */
export const permissionKeyRegex = /^[a-z0-9:_-]+$/;

export const corePermissionKeys = Object.values(
	Permissions,
) as CorePermission[];

/**
 * Checks whether a permission string is one of Lucid's built-in permission keys.
 */
export const isCorePermission = (
	permission: string,
): permission is CorePermission => {
	return corePermissionKeys.includes(permission as CorePermission);
};

/**
 * Accepts either a core group enum key or group key so config can extend core groups.
 */
const resolveGroupKey = (group: string) => {
	const coreGroup = Object.entries(PermissionGroups).find(
		([key, value]) => key === group || value.key === group,
	);
	return coreGroup?.[1].key ?? group;
};

/**
 * Builds the combined core and config permission catalogue used by API and UI metadata.
 */
export const getPermissionRegistry = (config?: Pick<Config, "access">) => {
	const groups = Object.values(PermissionGroups).map<PermissionGroup>(
		(group) => ({
			...group,
			permissions: [...group.permissions],
		}),
	);

	for (const [key, group] of Object.entries(config?.access.groups ?? {})) {
		groups.push({
			key,
			details: {
				name: group.name,
				description: group.description,
			},
			core: false,
			permissions: [],
		});
	}

	for (const [key, permission] of Object.entries(
		config?.access.permissions ?? {},
	)) {
		const groupKey = resolveGroupKey(permission.group);
		const group = groups.find((group) => group.key === groupKey);
		if (!group) continue;

		group.permissions.push({
			key,
			details: {
				name: permission.name,
				description: permission.description,
			},
			core: false,
		} satisfies PermissionDefinition);
	}

	return groups;
};

/**
 * Flattens the permission registry into grantable keys for role validation and sync.
 */
export const getValidPermissions = (
	config?: Pick<Config, "access">,
): Permission[] => {
	return getPermissionRegistry(config).flatMap((group) =>
		group.permissions.map((permission) => permission.key),
	);
};

/**
 * Verifies that a permission string exists in either Lucid core or config access.
 */
export const isRegisteredPermission = (
	config: Pick<Config, "access">,
	permission: string,
) => {
	return getValidPermissions(config).includes(permission);
};
