import type { Config } from "../../../types/config.js";
import { translateServer } from "../../i18n/index.js";
import { PermissionGroups } from "../../permission/definitions.js";
import {
	corePermissionKeys,
	isCorePermission,
	permissionKeyRegex,
} from "../../permission/registry.js";

/**
 * Finds repeated config keys so access validation can report collisions clearly.
 */
const findDuplicates = (values: string[]) => {
	return values.filter((value, index) => values.indexOf(value) !== index);
};

/**
 * Stops duplicate access config keys before permission and role sync can persist them.
 */
const ensureNoDuplicates = (label: string, values: string[]) => {
	const duplicates = [...new Set(findDuplicates(values))];
	if (duplicates.length > 0) {
		throw new Error(
			translateServer("core.config.access.duplicate.keys", {
				label,
				keys: duplicates.join(", "),
			}),
		);
	}
};

/**
 * Validates that config references only registered core or custom permission keys.
 */
const ensureValidReference = (
	validPermissions: Set<string>,
	permission: string,
	context: string,
) => {
	if (!validPermissions.has(permission)) {
		throw new Error(
			translateServer("core.config.access.unknown.permission.reference", {
				context,
				permission,
			}),
		);
	}
};

/**
 * Validates custom permission config and collection mappings before Lucid starts.
 */
const checkAccess = (config: Config) => {
	const customGroups = config.access.groups;
	const customPermissions = config.access.permissions;
	const customPermissionKeys = Object.keys(customPermissions);

	ensureNoDuplicates(
		"access.roles",
		config.access.roles.map((role) => role.key),
	);

	const coreGroupReferences = new Set<string>([
		...Object.keys(PermissionGroups),
		...Object.values(PermissionGroups).map((group) => group.key),
	]);

	for (const groupKey of Object.keys(customGroups)) {
		if (coreGroupReferences.has(groupKey)) {
			throw new Error(
				translateServer("core.config.access.core.group.collision", {
					group: groupKey,
				}),
			);
		}
	}

	for (const permission of customPermissionKeys) {
		if (!permissionKeyRegex.test(permission)) {
			throw new Error(
				translateServer("core.config.access.invalid.permission.key", {
					permission,
				}),
			);
		}
		if (isCorePermission(permission)) {
			throw new Error(
				translateServer("core.config.access.core.permission.collision", {
					permission,
				}),
			);
		}

		const group = customPermissions[permission]?.group;
		if (
			group === undefined ||
			(!coreGroupReferences.has(group) && !customGroups[group])
		) {
			throw new Error(
				translateServer(
					"core.config.access.unknown.permission.group.reference",
					{
						permission,
						group: group ?? "",
					},
				),
			);
		}
	}

	const validPermissions = new Set<string>([
		...corePermissionKeys,
		...customPermissionKeys,
	]);

	for (const role of config.access.roles) {
		for (const permission of role.permissions) {
			ensureValidReference(
				validPermissions,
				permission,
				translateServer("core.config.access.managed.role.context", {
					role: role.key,
				}),
			);
		}
	}

	for (const collection of config.collections) {
		for (const [action, permission] of Object.entries(
			collection.getData.permissions,
		)) {
			if (permission === undefined) continue;
			ensureValidReference(
				validPermissions,
				permission,
				translateServer("core.config.access.collection.permission.context", {
					collection: collection.key,
					action,
				}),
			);
		}

		for (const environment of collection.getData.config.environments) {
			if (environment.permissions.publish !== undefined) {
				ensureValidReference(
					validPermissions,
					environment.permissions.publish,
					translateServer(
						"core.config.access.collection.environment.publish.context",
						{
							collection: collection.key,
							environment: environment.key,
						},
					),
				);
			}

			if (environment.permissions.review !== undefined) {
				ensureValidReference(
					validPermissions,
					environment.permissions.review,
					translateServer(
						"core.config.access.collection.environment.review.context",
						{
							collection: collection.key,
							environment: environment.key,
						},
					),
				);
			}
		}
	}
};

export default checkAccess;
