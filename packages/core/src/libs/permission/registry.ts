import type { Config } from "../../types/config.js";
import type { CollectionPermissionAction } from "../collection/builders/collection-builder/types.js";
import { normalizeCopy } from "../i18n/index.js";
import {
	documentActionPermissions,
	resolveCollectionPermission,
} from "./collection-permissions.js";
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

export const getCustomPermissionDefinitions = (
	groups: Config["access"]["groups"],
) =>
	Object.entries(groups).flatMap(([groupKey, group]) =>
		Object.entries(group.permissions).map(([key, permission]) => ({
			key,
			groupKey,
			permission,
		})),
	);

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
				name: normalizeCopy(group.name),
				description: normalizeCopy(group.description),
			},
			core: false,
			permissions: Object.entries(group.permissions).map(
				([permissionKey, permission]) =>
					({
						key: permissionKey,
						details: {
							name: normalizeCopy(permission.name),
							description: normalizeCopy(permission.description),
						},
						core: false,
					}) satisfies PermissionDefinition,
			),
		});
	}

	return groups;
};

const coreDocumentPermissionsWithGlobalUse = new Set<Permission>([
	// Release request list/detail routes and admin navigation still use this as
	// a global review management permission.
	Permissions.DocumentsReview,
]);

const getCollectionDocumentPermissionsInUse = (
	config?: Pick<Config, "collections">,
) => {
	const permissions = new Set<Permission>();

	for (const collection of config?.collections ?? []) {
		const collectionData = collection.getData;

		for (const [action] of Object.entries(documentActionPermissions) as Array<
			[CollectionPermissionAction, Permission]
		>) {
			permissions.add(
				resolveCollectionPermission({
					collection,
					action,
				}),
			);

			if (action !== "publish" && action !== "review") continue;

			for (const environment of collectionData.environments) {
				permissions.add(
					resolveCollectionPermission({
						collection,
						action,
						target: environment.key,
					}),
				);
			}
		}
	}

	return permissions;
};

/**
 * Builds the permission catalogue shown in role management.
 * Core document permissions are hidden when collection mappings fully replace
 * them, while validation still uses the full permission registry.
 */
export const getGrantablePermissionRegistry = (
	config?: Pick<Config, "access" | "collections">,
) => {
	const permissionsInUse = getCollectionDocumentPermissionsInUse(config);

	for (const permission of coreDocumentPermissionsWithGlobalUse) {
		permissionsInUse.add(permission);
	}

	const hiddenCoreDocumentPermissions = new Set<Permission>(
		Object.values(documentActionPermissions).filter(
			(permission) => !permissionsInUse.has(permission),
		),
	);

	return getPermissionRegistry(config)
		.map<PermissionGroup>((group) => ({
			...group,
			permissions: group.permissions.filter(
				(permission) => !hiddenCoreDocumentPermissions.has(permission.key),
			),
		}))
		.filter((group) => group.permissions.length > 0);
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
