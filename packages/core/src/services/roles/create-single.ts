import { copy } from "../../libs/i18n/index.js";
import { isCorePermission } from "../../libs/permission/registry.js";
import {
	RolePermissionsRepository,
	RolesRepository,
	RoleTranslationsRepository,
} from "../../libs/repositories/index.js";
import { getTenantConfig } from "../../utils/helpers/index.js";
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
			tenantKey?: string | null;
			authSuperAdmin: boolean;
		},
	],
	number
> = async (context, data) => {
	const Roles = new RolesRepository(context.db.client, context.config.db);
	const RoleTranslations = new RoleTranslationsRepository(
		context.db.client,
		context.config.db,
	);
	const defaultRoleLocale = context.config.i18n.defaultLocale;

	const defaultName = getTranslationValue(data.name, defaultRoleLocale);
	const defaultDescription = getTranslationValue(
		data.description,
		defaultRoleLocale,
	);
	const tenantKey =
		data.tenantKey === undefined
			? (context.request.tenantKey ?? null)
			: data.tenantKey;

	/**
	 * Explicit tenant assignment can move a role across tenant boundaries, so it is super-admin only.
	 */
	if (data.tenantKey !== undefined && !data.authSuperAdmin) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.permissions.denied"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (!defaultName || defaultName.length < 2) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.errors.validation.message"),
				status: 400,
				errors: {
					name: {
						code: "invalid",
						message: copy("server:core.fields.validation.required"),
					},
				},
			},
			data: undefined,
		};
	}

	if (
		tenantKey !== null &&
		getTenantConfig(context.config, tenantKey) === undefined
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.tenants.unknown", {
					data: { key: tenantKey },
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	const [validatePermsRes, checkNameIsUniqueRes] = await Promise.all([
		roleServices.validatePermissions(context, {
			permissions: data.permissions,
		}),
		Roles.selectRoleIdByTranslationName({
			name: defaultName,
			localeCode: defaultRoleLocale,
			tenantKey,
		}),
	]);
	if (validatePermsRes.error) return validatePermsRes;
	if (checkNameIsUniqueRes.error) return checkNameIsUniqueRes;

	if (checkNameIsUniqueRes.data !== undefined) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.validation.unique.message"),
				status: 400,
				errors: {
					name: {
						code: "invalid",
						message: copy("server:core.validation.unique.message"),
					},
				},
			},
			data: undefined,
		};
	}

	const newRolesRes = await Roles.createSingle({
		data: {
			tenant_key: tenantKey,
		},
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
