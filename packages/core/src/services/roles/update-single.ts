import { isCorePermission } from "../../libs/permission/registry.js";
import {
	RolePermissionsRepository,
	RolesRepository,
	RoleTranslationsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { roleServices } from "../index.js";
import {
	getTranslationValue,
	prepareRoleTranslations,
	type RoleTranslationInput,
} from "./helpers/role-translations.js";

const updateSingle: ServiceFn<
	[
		{
			id: number;
			name?: RoleTranslationInput;
			description?: RoleTranslationInput;
			permissions?: string[];
		},
	],
	undefined
> = async (context, data) => {
	const Roles = new RolesRepository(context.db.client, context.config.db);
	const RoleTranslations = new RoleTranslationsRepository(
		context.db.client,
		context.config.db,
	);
	const defaultRoleLocale = context.config.localization.defaultLocale;
	const roleLocaleCodes = new Set(
		context.config.localization.locales.map((locale) => locale.code),
	);

	const defaultName = getTranslationValue(data.name, defaultRoleLocale);
	const defaultDescription = getTranslationValue(
		data.description,
		defaultRoleLocale,
	);

	const [roleRes, validatePermsRes, checkNameIsUniqueRes] = await Promise.all([
		Roles.selectSingleById({
			id: data.id,
			validation: {
				enabled: true,
			},
		}),
		data.permissions !== undefined
			? roleServices.validatePermissions(context, {
					permissions: data.permissions,
				})
			: undefined,
		defaultName !== undefined
			? RoleTranslations.selectSingle({
					select: ["role_id"],
					where: [
						{
							key: "name",
							operator: "=",
							value: defaultName,
						},
						{
							key: "role_id",
							operator: "!=",
							value: data.id,
						},
						{
							key: "locale_code",
							operator: "=",
							value: defaultRoleLocale,
						},
					],
				})
			: undefined,
	]);
	if (roleRes.error) return roleRes;
	if (checkNameIsUniqueRes?.error) return checkNameIsUniqueRes;
	if (validatePermsRes?.error) return validatePermsRes;

	if (roleRes.data.locked === context.config.db.getDefault("boolean", "true")) {
		return {
			error: {
				type: "basic",
				message: T("you_do_not_have_permission_to_perform_this_action"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (data.name !== undefined && (!defaultName || defaultName.length < 2)) {
		return {
			error: {
				type: "basic",
				message: T("validation_error_message"),
				status: 400,
				errors: {
					name: {
						code: "invalid",
						message: T("generic_field_required"),
					},
				},
			},
			data: undefined,
		};
	}

	if (defaultName !== undefined && checkNameIsUniqueRes?.data !== undefined) {
		return {
			error: {
				type: "basic",
				message: T("not_unique_error_message"),
				status: 400,
				errors: {
					name: {
						code: "invalid",
						message: T("not_unique_error_message"),
					},
				},
			},
			data: undefined,
		};
	}
	const updateData = {
		updated_at: new Date().toISOString(),
	};
	const updateRoleRes = await Roles.updateSingle({
		data: updateData,
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (updateRoleRes.error) return updateRoleRes;

	if (data.name !== undefined || data.description !== undefined) {
		const existingNameTranslations: RoleTranslationInput =
			roleRes.data.translations
				?.filter(
					(translation) =>
						translation.locale_code !== null &&
						roleLocaleCodes.has(translation.locale_code),
				)
				.map((translation) => ({
					localeCode: translation.locale_code,
					value: translation.name,
				})) ?? [];
		const existingDescriptionTranslations: RoleTranslationInput =
			roleRes.data.translations
				?.filter(
					(translation) =>
						translation.locale_code !== null &&
						roleLocaleCodes.has(translation.locale_code),
				)
				.map((translation) => ({
					localeCode: translation.locale_code,
					value: translation.description,
				})) ?? [];
		const existingDefaultName = getTranslationValue(
			existingNameTranslations,
			defaultRoleLocale,
		);
		const existingDefaultDescription = getTranslationValue(
			existingDescriptionTranslations,
			defaultRoleLocale,
		);
		const translations = prepareRoleTranslations({
			name: data.name ?? existingNameTranslations,
			description: data.description ?? existingDescriptionTranslations,
			roleId: data.id,
		});
		if (
			translations.every(
				(translation) => translation.locale_code !== defaultRoleLocale,
			)
		) {
			translations.push({
				role_id: data.id,
				locale_code: defaultRoleLocale,
				name:
					data.name !== undefined
						? (defaultName ?? null)
						: (existingDefaultName ?? null),
				description:
					data.description !== undefined
						? (defaultDescription ?? null)
						: (existingDefaultDescription ?? null),
			});
		}
		const deleteTranslationsRes = await RoleTranslations.deleteMultiple({
			where: [
				{
					key: "role_id",
					operator: "=",
					value: data.id,
				},
			],
			returning: ["id"],
		});
		if (deleteTranslationsRes.error) return deleteTranslationsRes;

		if (translations.length > 0) {
			const roleTranslationsRes = await RoleTranslations.upsertMultiple({
				data: translations,
				returning: ["id"],
				validation: {
					enabled: true,
				},
			});
			if (roleTranslationsRes.error) return roleTranslationsRes;
		}
	}

	if (validatePermsRes?.data !== undefined) {
		const RolePermissions = new RolePermissionsRepository(
			context.db.client,
			context.config.db,
		);

		const deletePermsRes = await RolePermissions.deleteMultiple({
			where: [
				{
					key: "role_id",
					operator: "=",
					value: data.id,
				},
			],
			returning: ["id"],
			validation: {
				enabled: true,
			},
		});
		if (deletePermsRes.error) return deletePermsRes;

		if (validatePermsRes.data.length > 0) {
			const rolePermsRes = await RolePermissions.createMultiple({
				data: validatePermsRes.data.map((p) => ({
					role_id: data.id,
					permission: p.permission,
					core: isCorePermission(p.permission),
				})),
			});
			if (rolePermsRes.error) return rolePermsRes;
		}
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateSingle;
