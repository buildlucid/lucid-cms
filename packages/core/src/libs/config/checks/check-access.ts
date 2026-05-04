import T from "../../../translations/index.js";
import type { Config, ConfiguredLocaleValue } from "../../../types/config.js";
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
			T("config_access_duplicate_keys", {
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
			T("config_access_unknown_permission_reference", {
				context,
				permission,
			}),
		);
	}
};

/**
 * Ensures managed role translations only use configured content locale codes.
 */
const ensureValidTranslationLocales = (
	validLocales: Set<string>,
	value: ConfiguredLocaleValue | undefined,
	context: string,
) => {
	if (value === undefined || typeof value === "string") return;

	const invalidLocales = Object.keys(value).filter(
		(locale) => !validLocales.has(locale),
	);
	if (invalidLocales.length === 0) return;

	throw new Error(
		T("config_access_unknown_role_translation_locale", {
			context,
			locales: invalidLocales.join(", "),
		}),
	);
};

/**
 * Validates custom permission config and collection mappings before Lucid starts.
 */
const checkAccess = (config: Config) => {
	const customGroups = config.access.permissionGroups;
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
				T("config_access_core_group_collision", {
					group: groupKey,
				}),
			);
		}
	}

	for (const permission of customPermissionKeys) {
		if (!permissionKeyRegex.test(permission)) {
			throw new Error(
				T("config_access_invalid_permission_key", {
					permission,
				}),
			);
		}
		if (isCorePermission(permission)) {
			throw new Error(
				T("config_access_core_permission_collision", {
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
				T("config_access_unknown_permission_group_reference", {
					permission,
					group: group ?? "",
				}),
			);
		}
	}

	const validPermissions = new Set<string>([
		...corePermissionKeys,
		...customPermissionKeys,
	]);
	const validLocales = new Set(
		config.localization.locales.map((locale) => locale.code),
	);

	for (const role of config.access.roles) {
		ensureValidTranslationLocales(
			validLocales,
			role.name,
			T("config_access_managed_role_name_context", {
				role: role.key,
			}),
		);
		ensureValidTranslationLocales(
			validLocales,
			role.description,
			T("config_access_managed_role_description_context", {
				role: role.key,
			}),
		);

		for (const permission of role.permissions) {
			ensureValidReference(
				validPermissions,
				permission,
				T("config_access_managed_role_context", {
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
				T("config_access_collection_permission_context", {
					collection: collection.key,
					action,
				}),
			);
		}

		for (const environment of collection.getData.config.environments) {
			if (environment.permissions.publish === undefined) continue;
			ensureValidReference(
				validPermissions,
				environment.permissions.publish,
				T("config_access_collection_environment_publish_context", {
					collection: collection.key,
					environment: environment.key,
				}),
			);
		}
	}
};

export default checkAccess;
