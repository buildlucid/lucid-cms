import {
	getValidPermissions,
	isCorePermission,
} from "../../libs/permission/registry.js";
import {
	RolePermissionsRepository,
	RolesRepository,
	RoleTranslationsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	getTranslationValue,
	normalizeTranslationArray,
	prepareRoleTranslations,
} from "../roles/helpers/role-translations.js";

/**
 * Synchronizes config-managed roles and prunes role grants for removed custom permissions.
 */
const syncRoles: ServiceFn<[], undefined> = async (context) => {
	const Roles = new RolesRepository(context.db.client, context.config.db);
	const RolePermissions = new RolePermissionsRepository(
		context.db.client,
		context.config.db,
	);
	const RoleTranslations = new RoleTranslationsRepository(
		context.db.client,
		context.config.db,
	);

	const rolesRes = await Roles.selectMultiple({
		select: ["id", "key", "locked"],
		validation: {
			enabled: true,
		},
	});
	if (rolesRes.error) return rolesRes;

	const managedRoles = context.config.access.roles;
	const managedRoleKeys = managedRoles.map((role) => role.key);
	const managedRoleIdsToDelete = rolesRes.data
		.filter(
			(role) =>
				role.locked === context.config.db.getDefault("boolean", "true") &&
				role.key !== null &&
				!managedRoleKeys.includes(role.key),
		)
		.map((role) => role.id);

	if (managedRoleIdsToDelete.length > 0) {
		const deleteRolesRes = await Roles.deleteMultiple({
			where: [
				{
					key: "id",
					operator: "in",
					value: managedRoleIdsToDelete,
				},
			],
			returning: ["id"],
		});
		if (deleteRolesRes.error) return deleteRolesRes;
	}

	for (const managedRole of managedRoles) {
		const defaultRoleLocale = context.config.localization.defaultLocale;
		const nameTranslations = normalizeTranslationArray(
			managedRole.name,
			defaultRoleLocale,
		);
		const descriptionTranslations = normalizeTranslationArray(
			managedRole.description,
			defaultRoleLocale,
		);
		const defaultName =
			getTranslationValue(nameTranslations, defaultRoleLocale) ??
			nameTranslations[0]?.value ??
			"";
		const defaultDescription =
			getTranslationValue(descriptionTranslations, defaultRoleLocale) ??
			descriptionTranslations[0]?.value ??
			null;
		const existingRole = rolesRes.data.find(
			(role) => role.key === managedRole.key,
		);

		const roleId = existingRole?.id;
		const upsertRoleRes =
			roleId === undefined
				? await Roles.createSingle({
						data: {
							key: managedRole.key,
							locked: true,
						},
						returning: ["id"],
						validation: {
							enabled: true,
						},
					})
				: await Roles.updateSingle({
						data: {
							locked: true,
							updated_at: new Date().toISOString(),
						},
						where: [
							{
								key: "id",
								operator: "=",
								value: roleId,
							},
						],
						returning: ["id"],
						validation: {
							enabled: true,
						},
					});
		if (upsertRoleRes.error) return upsertRoleRes;

		const syncedRoleId = upsertRoleRes.data.id;
		const deleteTranslationsRes = await RoleTranslations.deleteMultiple({
			where: [
				{
					key: "role_id",
					operator: "=",
					value: syncedRoleId,
				},
			],
			returning: ["id"],
		});
		if (deleteTranslationsRes.error) return deleteTranslationsRes;

		const translations = prepareRoleTranslations({
			name: nameTranslations,
			description: descriptionTranslations,
			roleId: syncedRoleId,
		});
		if (
			translations.every(
				(translation) => translation.locale_code !== defaultRoleLocale,
			)
		) {
			translations.push({
				role_id: syncedRoleId,
				locale_code: defaultRoleLocale,
				name: defaultName,
				description: defaultDescription,
			});
		}
		if (translations.length > 0) {
			const upsertTranslationsRes = await RoleTranslations.upsertMultiple({
				data: translations,
				returning: ["id"],
				validation: {
					enabled: true,
				},
			});
			if (upsertTranslationsRes.error) return upsertTranslationsRes;
		}

		const deletePermissionsRes = await RolePermissions.deleteMultiple({
			where: [
				{
					key: "role_id",
					operator: "=",
					value: syncedRoleId,
				},
			],
			returning: ["id"],
		});
		if (deletePermissionsRes.error) return deletePermissionsRes;

		if (managedRole.permissions.length > 0) {
			const createPermissionsRes = await RolePermissions.createMultiple({
				data: managedRole.permissions.map((permission) => ({
					role_id: syncedRoleId,
					permission,
					core: isCorePermission(permission),
				})),
			});
			if (createPermissionsRes.error) return createPermissionsRes;
		}
	}

	const validPermissions = getValidPermissions(context.config);
	const prunePermissionsRes = await RolePermissions.deleteMultiple({
		where: [
			{
				key: "permission",
				operator: "not in",
				value: validPermissions,
			},
		],
		returning: ["id"],
	});
	if (prunePermissionsRes.error) return prunePermissionsRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default syncRoles;
