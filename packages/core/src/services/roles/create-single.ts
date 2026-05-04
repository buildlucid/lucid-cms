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

const createSingle: ServiceFn<
	[
		{
			name: RoleTranslationInput;
			description?: RoleTranslationInput;
			permissions: string[];
		},
	],
	number
> = async (context, data) => {
	const Roles = new RolesRepository(context.db.client, context.config.db);
	const RoleTranslations = new RoleTranslationsRepository(
		context.db.client,
		context.config.db,
	);
	const defaultRoleLocale = context.config.localization.defaultLocale;

	const defaultName = getTranslationValue(data.name, defaultRoleLocale);
	const defaultDescription = getTranslationValue(
		data.description,
		defaultRoleLocale,
	);

	if (!defaultName || defaultName.length < 2) {
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

	const [validatePermsRes, checkNameIsUniqueRes] = await Promise.all([
		roleServices.validatePermissions(context, {
			permissions: data.permissions,
		}),
		RoleTranslations.selectSingle({
			select: ["role_id"],
			where: [
				{
					key: "name",
					operator: "=",
					value: defaultName,
				},
				{
					key: "locale_code",
					operator: "=",
					value: defaultRoleLocale,
				},
			],
		}),
	]);
	if (validatePermsRes.error) return validatePermsRes;
	if (checkNameIsUniqueRes.error) return checkNameIsUniqueRes;

	if (checkNameIsUniqueRes.data !== undefined) {
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

	const newRolesRes = await Roles.createSingle({
		data: {},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (newRolesRes.error) return newRolesRes;

	const translations = prepareRoleTranslations({
		name: data.name,
		description: data.description,
		roleId: newRolesRes.data.id,
	});
	if (
		translations.every(
			(translation) => translation.locale_code !== defaultRoleLocale,
		)
	) {
		translations.push({
			role_id: newRolesRes.data.id,
			locale_code: defaultRoleLocale,
			name: defaultName,
			description: defaultDescription ?? null,
		});
	}
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

	if (validatePermsRes.data.length > 0) {
		const RolePermissions = new RolePermissionsRepository(
			context.db.client,
			context.config.db,
		);
		const rolePermsRes = await RolePermissions.createMultiple({
			data: validatePermsRes.data.map((p) => ({
				role_id: newRolesRes.data.id,
				permission: p.permission,
				core: isCorePermission(p.permission),
			})),
		});
		if (rolePermsRes.error) return rolePermsRes;
	}

	return {
		error: undefined,
		data: newRolesRes.data.id,
	};
};

export default createSingle;
